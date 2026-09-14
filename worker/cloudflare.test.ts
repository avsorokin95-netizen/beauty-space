import { linkEvent } from '../shared/analytics.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import sharp from 'sharp';
import { chromium } from '@playwright/test';
import { extname, join } from 'node:path';
import { prices } from '../src/data/prices.ts';
import { studio } from '../src/data/studio.ts';
import { initialGallery } from '../src/data/gallery.ts';

test('Worker: Access signatures, permissions, D1 conflicts, R2 uploads and SEO', async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...await exportJWK(publicKey), kid: 'test-key', alg: 'RS256', use: 'sig' };
  const bundle = await build({ entryPoints: ['worker/index.ts'], bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2023' });
  const origin = 'https://studio.example';
  const issuer = 'https://test-team.cloudflareaccess.com';
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-09-11',
    d1Databases: ['DB'], r2Buckets: ['MEDIA'],
    ratelimits: { ANALYTICS_LIMITER: { namespace_id: '9142026', simple: { limit: 30, period: 60 } } },
    bindings: { WEB_ANALYTICS_TOKEN: '8d41b30a9ff545b0b885f0387148869b', APP_ORIGIN: origin, ACCESS_TEAM_DOMAIN: 'test-team.cloudflareaccess.com', ACCESS_AUD: 'test-aud', ADMIN_EMAILS: 'owner@example.com,studio@example.com' },
    serviceBindings: { ASSETS: (request) => {
      const path = new URL(request.url).pathname;
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.jpg': 'image/jpeg' }[extname(path)] || 'application/octet-stream';
      try { return new Response(readFileSync(join('dist', path)), { headers: { 'Content-Type': mime } }); }
      catch { return new Response('Not found', { status: 404 }); }
    } },
    outboundService: (request) => {
      assert.equal(request.url, `${issuer}/cdn-cgi/access/certs`);
      return Response.json({ keys: [jwk] });
    },
  }));
  try {
    const db = await mf.getD1Database('DB');
    await db.exec(readFileSync('worker/migrations/0001_documents.sql', 'utf8').replaceAll('\n', ' '));
    await db.exec(readFileSync('worker/migrations/0002_analytics.sql', 'utf8').replace(/--[^\n]*/g, '').replaceAll('\n', ' '));
    for (const [kind, data] of Object.entries({ prices, contacts: studio, gallery: initialGallery })) {
      await db.prepare('INSERT INTO documents VALUES (?, 1, ?, ?)').bind(kind, new Date().toISOString(), JSON.stringify(data)).run();
    }
    const token = (email = 'owner@example.com', audience = 'test-aud', expiration = '1h', tokenIssuer = issuer) => new SignJWT({ email, type: 'app' }).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setSubject('test-user').setIssuer(tokenIssuer).setAudience(audience).setIssuedAt().setExpirationTime(expiration).sign(privateKey);
    let jwt = await token();
    const send = (path: string, method = 'GET', body?: unknown, override?: string) => mf.dispatchFetch(origin + path, {
      method, headers: { Origin: override ?? origin, 'Cf-Access-Jwt-Assertion': jwt, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
    });
    const redirected = await mf.dispatchFetch('https://old.example/?source=instagram', { redirect: 'manual' });
    assert.equal(redirected.status, 301);
    assert.equal(redirected.headers.get('location'), `${origin}/?source=instagram`);
    assert.equal((await mf.dispatchFetch(origin + '/api/admin/session')).status, 401);
    assert.equal((await mf.dispatchFetch(origin + '/admin')).status, 401);
    assert.equal((await send('/api/admin/session')).status, 200);
    for (const bad of [await token('other@example.com'), await token('owner@example.com', 'wrong-aud'), await token('owner@example.com', 'test-aud', '-1h'), await token('owner@example.com', 'test-aud', '1h', 'https://evil.example'), jwt.slice(0, -12) + 'abcdefghijkl']) {
      jwt = bad;
      assert.equal((await send('/api/admin/session')).status, 401);
    }
    jwt = await token('studio@example.com');
    assert.equal((await send('/api/admin/session')).status, 200);
    assert.equal((await send('/api/login', 'POST', { password: 'unused' })).status, 404);
    assert.equal((await send('/api/admin/password', 'PUT', {})).status, 404);
    assert.equal((await mf.dispatchFetch(origin + '/api/admin/analytics')).status, 401);
    assert.equal((await send('/api/analytics', 'POST', { event: 'booking' }, 'https://evil.example')).status, 403);
    assert.equal((await send('/api/analytics', 'POST', { event: 'unknown' })).status, 400);
    assert.equal((await send('/api/analytics', 'POST', { event: 'booking', email: 'private@example.com' })).status, 400);
    assert.equal((await send('/api/analytics', 'POST', { event: 'x'.repeat(200) })).status, 413);
    for (const event of ['booking', 'booking', 'phone']) assert.equal((await send('/api/analytics', 'POST', { event })).status, 204);
    const clickStats = await (await send('/api/admin/analytics?days=7')).json() as { rows: { event: string; count: number }[] };
    assert.equal(clickStats.rows.find((row) => row.event === 'booking')?.count, 2);
    assert.equal(clickStats.rows.find((row) => row.event === 'phone')?.count, 1);
    assert.equal((await send('/api/admin/analytics?days=999')).status, 400);
    assert.ok(!(await (await send('/admin')).text()).includes('beacon.min.js'));
    const current = await (await send('/api/prices')).json() as { revision: number; prices: typeof prices };
    current.prices.nails.items[0].price = '777 грн';
    assert.equal((await send('/api/admin/prices', 'PUT', current, 'https://evil.example')).status, 403);
    const writes = await Promise.all([send('/api/admin/prices', 'PUT', current), send('/api/admin/prices', 'PUT', current)]);
    assert.deepEqual(writes.map((res) => res.status).sort(), [200, 409]);
    assert.equal((await send('/api/admin/prices', 'PUT', { ...current, revision: 2, prices: {} })).status, 400);
    const contacts = await (await send('/api/contacts')).json() as { revision: number; contacts: typeof studio };
    contacts.contacts.city = 'Київ';
    assert.equal((await send('/api/admin/contacts', 'PUT', contacts)).status, 200);
    const html = await (await send('/')).text();
    assert.equal((html.match(/beacon.min.js/g) ?? []).length, 1);
    assert.ok(html.includes('"spa":false'));
    assert.ok(html.includes('777 грн') && html.includes('Київ') && html.includes('studio-schema'));
    assert.ok(html.includes(`href="${origin}/"`));
    const admin = await send('/admin');
    assert.equal(admin.headers.get('cache-control'), 'no-store');
    assert.match(admin.headers.get('x-robots-tag')!, /noindex/);
    assert.match(await (await send('/robots.txt')).text(), /Disallow: \/admin/);
    assert.match(await (await send('/sitemap.xml')).text(), /studio.example/);
    const photo = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#ddbbcc' } }).webp().toBuffer();
    const upload = (body: Uint8Array, mime = 'image/webp') => mf.dispatchFetch(origin + '/api/admin/gallery/upload', { method: 'POST', headers: { Origin: origin, 'Cf-Access-Jwt-Assertion': jwt, 'Content-Type': mime }, body });
    assert.equal((await upload(Buffer.from('<svg/>'), 'image/svg+xml')).status, 415);
    assert.equal((await upload(Buffer.from('invalid'))).status, 415);
    assert.equal((await upload(new Uint8Array(8 * 1024 * 1024 + 1))).status, 413);
    const uploaded = await upload(photo);
    assert.equal(uploaded.status, 201, await uploaded.clone().text());
    const { src } = await uploaded.json() as { src: string };
    const media = await mf.dispatchFetch(origin + src);
    assert.equal(media.status, 200);
    assert.equal(media.headers.get('content-type'), 'image/webp');
    assert.deepEqual(Buffer.from(await media.arrayBuffer()), photo);
    assert.equal(media.headers.get('x-robots-tag'), null);
    const gallery = await (await send('/api/gallery')).json() as { revision: number; items: typeof initialGallery };
    gallery.items[0].src = src;
    assert.equal((await send('/api/admin/gallery', 'PUT', gallery)).status, 200);
    gallery.revision++;
    gallery.items[0].src = 'https://evil.example/photo';
    assert.equal((await send('/api/admin/gallery', 'PUT', gallery)).status, 400);
    assert.equal((await send('/api/admin/gallery', 'PUT', { ...gallery, items: [] })).status, 400);

    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      let expired = false;
      let publicApiUnavailable = false;
      await page.route('**/*', async (route) => {
        const request = route.request();
        if (!request.url().startsWith(origin + '/')) return route.abort();
        if (publicApiUnavailable && /^\/api\/(prices|gallery|contacts)$/.test(new URL(request.url()).pathname)) return route.abort();
        if (expired && request.url().includes('/api/admin/')) return route.fulfill({ status: 302, headers: { Location: `${issuer}/cdn-cgi/access/login` } });
        const response = await mf.dispatchFetch(request.url(), { method: request.method(), headers: { ...request.headers(), 'Cf-Access-Jwt-Assertion': jwt }, body: request.postDataBuffer() ?? undefined });
        await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
      });
      publicApiUnavailable = true;
      await page.goto(origin + '/');
      await page.getByRole('button', { name: /01 Манікюр/ }).click();
      await page.getByText('777 грн', { exact: true }).waitFor();
      assert.ok(await page.locator('.gallery-slide').count() >= initialGallery.length);
      await page.locator('.gallery-slide img').first().evaluate((image: HTMLImageElement) => image.decode());
      publicApiUnavailable = false;
      const clickResponse = page.waitForResponse('**/api/analytics');
      await page.locator('.hero [data-analytics="booking"]').click();
      assert.equal((await clickResponse).status(), 204);
      await page.goto(origin + '/admin');
      await page.getByRole('button', { name: 'Статистика', exact: true }).click();
      await page.getByRole('table').waitFor();
      assert.ok((await page.locator('.analytics-totals').innerText()).includes('Записатися\n3'));
      await page.getByLabel('Період').selectOption('7');
      await page.getByRole('table').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: 'output/analytics-mobile.png', fullPage: true });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.screenshot({ path: 'output/analytics-desktop.png', fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole('button', { name: 'Безпека', exact: true }).click();
      await page.getByText('Вхід за одноразовим кодом на дозволену пошту.', { exact: false }).waitFor();
      assert.equal(await page.locator('input[type=password]:visible').count(), 0);
      await page.getByRole('button', { name: 'Роботи', exact: true }).click();
      const png = await sharp(photo).png().toBuffer();
      const uploadResponse = page.waitForResponse('**/api/admin/gallery/upload');
      await page.locator('#add-gallery-photo').setInputFiles({ name: 'new.png', mimeType: 'image/png', buffer: png });
      const browserUpload = await uploadResponse;
      assert.equal(browserUpload.status(), 201, await browserUpload.text());
      await page.getByRole('button', { name: 'Опублікувати роботи', exact: true }).click();
      await page.getByText('Роботи збережено й опубліковано.').waitFor();
      const updated = await (await send('/api/gallery')).json() as { items: typeof initialGallery };
      assert.equal(updated.items.length, initialGallery.length + 1);
      assert.match(updated.items.at(-1)!.src, /^\/api\/media\//);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.getByRole('button', { name: 'Ціни', exact: true }).click();
      await page.locator('#price-nails-0').fill('888 грн');
      expired = true;
      await page.getByRole('button', { name: 'Зберегти зміни', exact: true }).click();
      await page.getByRole('link', { name: 'Підтвердити пошту' }).waitFor();
      expired = false;
      await page.getByRole('button', { name: 'Я підтвердив(-ла) вхід' }).click();
      await page.locator('#price-nails-0').waitFor();
      assert.equal(await page.locator('#price-nails-0').inputValue(), '888 грн');
    } finally { await browser.close(); }
    for (let n = 0; n < 30; n++) await send('/api/analytics', 'POST', { event: 'booking' });
    assert.equal((await send('/api/analytics', 'POST', { event: 'booking' })).status, 429);
  } finally { await mf.dispose(); }
});


test('Analytics distinguishes contact actions and ignores unrelated links', () => {
  assert.equal(linkEvent('https://example.com/book', true), 'booking');
  assert.equal(linkEvent('tel:+380939314056', false), 'phone');
  assert.equal(linkEvent('https://ig.me/m/studio', false), 'booking');
  assert.equal(linkEvent('https://www.instagram.com/studio/', false), 'instagram');
  assert.equal(linkEvent('https://t.me/studio', false), 'telegram');
  assert.equal(linkEvent('https://www.google.com/maps/search/?api=1', false), 'directions');
  for (const href of ['#services', 'https://example.com', 'https://instagram.com.evil.test', 'javascript:alert(1)']) assert.equal(linkEvent(href, false), undefined);
});
