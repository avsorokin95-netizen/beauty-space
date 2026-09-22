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
import { MAX_GALLERY_ALT_LENGTH, type GalleryDocument } from '../shared/gallery.ts';

test('Worker: Access signatures, permissions, D1 conflicts, R2 uploads and SEO', async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...await exportJWK(publicKey), kid: 'test-key', alg: 'RS256', use: 'sig' };
  const bundle = await build({ entryPoints: ['worker/index.ts'], bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2023' });
  const origin = 'https://studio.example';
  const issuer = 'https://test-team.cloudflareaccess.com';
  let analyticsUnavailable = false;
  let analyticsRequests = 0;
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-09-11',
    d1Databases: ['DB'], r2Buckets: ['MEDIA'],
    ratelimits: { ANALYTICS_LIMITER: { namespace_id: '9142026', simple: { limit: 30, period: 60 } } },
    bindings: { CF_ANALYTICS_API_TOKEN: 'test-read-token', CF_ANALYTICS_ACCOUNT_ID: '7fa5e6d60edca4265f9829b6bc448d6b', CF_ANALYTICS_SITE_ID: 'ac736284c7bc428f896ce42c457c8687', WEB_ANALYTICS_TOKEN: '8d41b30a9ff545b0b885f0387148869b', APP_ORIGIN: origin, ACCESS_TEAM_DOMAIN: 'test-team.cloudflareaccess.com', ACCESS_AUD: 'test-aud', ADMIN_EMAILS: 'owner@example.com,studio@example.com' },
    serviceBindings: { ASSETS: (request) => {
      const path = new URL(request.url).pathname;
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' }[extname(path)] || 'application/octet-stream';
      try { return new Response(readFileSync(join('dist', path)), { headers: { 'Content-Type': mime } }); }
      catch { return new Response('Not found', { status: 404 }); }
    } },
    outboundService: async (request) => {
      if (request.url === 'https://api.cloudflare.com/client/v4/graphql') {
        analyticsRequests++;
        assert.equal(request.headers.get('Authorization'), 'Bearer test-read-token');
        const body = await request.json() as { variables: { site: string; start: string; end: string }; query: string };
        const duration = Date.parse(body.variables.end) - Date.parse(body.variables.start);
        const sampleInterval = duration <= 7 * 86400000 ? 1 : 10;
        assert.equal(body.variables.site, 'ac736284c7bc428f896ce42c457c8687');
        assert.ok(body.query.includes('bot: 0'));
        if (analyticsUnavailable) return Response.json({ errors: [{ message: 'Unavailable' }] });
        return Response.json({ data: { viewer: { accounts: [{ rumPageloadEventsAdaptiveGroups: [
          { count: 12, sum: { visits: 8 }, avg: { sampleInterval }, dimensions: { date: new Date().toISOString().slice(0, 10) } },
          { count: 5, sum: { visits: 4 }, avg: { sampleInterval }, dimensions: { date: new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10) } },
        ].filter((row) => row.dimensions.date >= body.variables.start.slice(0, 10)) }] } }, errors: null });
      }
      assert.equal(request.url, `${issuer}/cdn-cgi/access/certs`);
      return Response.json({ keys: [jwk] });
    },
  }));
  try {
    const db = await mf.getD1Database('DB');
    await db.exec(readFileSync('worker/migrations/0001_documents.sql', 'utf8').replaceAll('\n', ' '));
    await db.exec(readFileSync('worker/migrations/0002_analytics.sql', 'utf8').replace(/--[^\n]*/g, '').replaceAll('\n', ' '));
    await db.exec(readFileSync('worker/migrations/0003_analytics_cache.sql', 'utf8').replace(/--[^\n]*/g, '').replaceAll('\n', ' '));
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
    const traffic = await (await send('/api/admin/analytics?days=7')).json() as { traffic: { status: string; rows: { visits: number }[] } };
    assert.equal(traffic.traffic.status, 'ready');
    assert.equal(traffic.traffic.rows.length, 1);
    assert.equal(traffic.traffic.rows[0].visits, 8);
    assert.equal(analyticsRequests, 1, 'Reports share a five-minute cache');
    await send('/api/admin/analytics?days=30');
    assert.equal(analyticsRequests, 2, 'Each selected period requests its own range');
    const saved = JSON.parse((await db.prepare('SELECT value FROM analytics_cache WHERE id=1').first<{ value: string }>())!.value);
    saved.reports['30'].report.updatedAt = new Date(Date.now() - 600000).toISOString();
    saved.reports['30'].report.rangeEnd = saved.reports['30'].report.updatedAt;
    await db.prepare('UPDATE analytics_cache SET value=? WHERE id=1').bind(JSON.stringify(saved)).run();
    analyticsUnavailable = true;
    const stale = await (await send('/api/admin/analytics?days=30')).json() as { traffic: { status: string; rows: unknown[] }; rows: unknown[] };
    assert.equal(stale.traffic.status, 'stale');
    assert.equal(stale.traffic.rows.length, 2);
    assert.ok(stale.rows.length, 'Click reports still work when Cloudflare fails');
    await db.prepare('DELETE FROM analytics_cache').run();
    const unavailable = await (await send('/api/admin/analytics?days=7')).json() as { traffic: { status: string; updatedAt: string | null } };
    assert.equal(unavailable.traffic.status, 'unavailable');
    assert.equal(unavailable.traffic.updatedAt, null, 'An upstream failure must not appear as zero visits');
    analyticsUnavailable = false;
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
    assert.ok(html.includes('<div id="root"><'));
    assert.ok(!html.includes('<noscript'));
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1);
    const schema = JSON.parse(html.match(/id="studio-schema">(.*?)<\/script>/)![1]);
    assert.equal(schema.hasOfferCatalog.itemListElement[0].itemListElement[0].price, 777);
    for (const catalog of schema.hasOfferCatalog.itemListElement) {
      for (const offer of catalog.itemListElement) assert.equal(offer.url, `${origin}/#services`);
    }
    const admin = await send('/admin');
    assert.equal(admin.headers.get('cache-control'), 'no-store');
    assert.match(admin.headers.get('x-robots-tag')!, /noindex/);
    assert.match(await (await send('/robots.txt')).text(), /Disallow: \/admin/);
    assert.match(await (await send('/sitemap.xml')).text(), /studio.example/);
    const sitemap = await (await send('/sitemap.xml')).text();
    assert.ok(sitemap.includes(`<loc>${origin}/</loc>`));
    assert.equal((sitemap.match(/<loc>/g) ?? []).length, 1);
    for (const slug of ['manicure', 'pedicure', 'brows', 'lashes']) {
      assert.ok(!html.includes(`href="/${slug}`), `The homepage must not link to the removed ${slug} route`);
      assert.ok(!sitemap.includes(`/${slug}`));
      for (const path of [`/${slug}`, `/${slug}/`, `/${slug}/index.html`]) {
        const response = await mf.dispatchFetch(origin + path + '?ref=test', { redirect: 'manual' });
        assert.equal(response.status, 404, `${path} must not serve or redirect to a removed page`);
      }
    }
    assert.equal((await send('/nonexistent-page/')).status, 404);
    assert.equal((await send('/manicure/nonexistent-page/')).status, 404);
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
    const gallery = await (await send('/api/gallery')).json() as GalleryDocument;
    gallery.items[0].src = src;
    gallery.items[0].alt = '  Рожеве покриття на коротких нігтях  ';
    delete gallery.items[1].alt;
    gallery.items[2].alt = '';
    for (const alt of [null, 123, false, {}, [], 'а'.repeat(MAX_GALLERY_ALT_LENGTH + 1)]) {
      const invalid = structuredClone(gallery);
      Object.assign(invalid.items[0], { alt });
      assert.equal((await send('/api/admin/gallery', 'PUT', invalid)).status, 400);
    }
    assert.equal((await send('/api/admin/gallery', 'PUT', gallery)).status, 200);
    const publishedGallery = await (await send('/api/gallery')).json() as GalleryDocument;
    assert.equal(publishedGallery.items[0].alt, 'Рожеве покриття на коротких нігтях');
    assert.equal(publishedGallery.items[0].title, gallery.items[0].title);
    assert.equal(Object.hasOwn(publishedGallery.items[1], 'alt'), false, 'Legacy items may omit the description');
    assert.equal(publishedGallery.items[2].alt, '', 'Empty descriptions allow the public fallback');
    const storedGallery = await db.prepare("SELECT data FROM documents WHERE kind = 'gallery'").first<{ data: string }>();
    assert.deepEqual(JSON.parse(storedGallery!.data), publishedGallery.items, 'The Worker persists descriptions in D1');
    gallery.revision++;
    gallery.items[0].src = 'https://evil.example/photo';
    assert.equal((await send('/api/admin/gallery', 'PUT', gallery)).status, 400);
    assert.equal((await send('/api/admin/gallery', 'PUT', { ...gallery, items: [] })).status, 400);

    const browser = await chromium.launch();
    try {
      const noScript = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
      await noScript.route('**/*', async (route) => {
        if (!route.request().url().startsWith(origin + '/')) return route.abort();
        const response = await mf.dispatchFetch(route.request().url());
        await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
      });
      const staticPage = await noScript.newPage();
      await staticPage.goto(origin + '/');
      assert.equal(await staticPage.locator('h1').count(), 1);
      assert.ok(await staticPage.locator('h1').isVisible());
      assert.equal(await staticPage.locator('h1').evaluate((element) => getComputedStyle(element.parentElement!).opacity), '1');
      assert.ok(await staticPage.getByRole('link', { name: /Записатися/ }).first().isVisible());
      assert.ok(await staticPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await staticPage.locator('[aria-controls="service-nails"]').click();
      assert.ok(await staticPage.getByText('777 грн', { exact: true }).isVisible());
      await noScript.close();
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const hydrationErrors: string[] = [];
      page.on('pageerror', (error) => hydrationErrors.push(error.message));
      page.on('console', (message) => { if (/hydration|hydrating|didn't match|server rendered HTML/i.test(message.text())) hydrationErrors.push(message.text()); });
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
      await page.getByRole('heading', { level: 1 }).waitFor();
      const loadedFonts = await page.evaluate(async () => {
        await document.fonts.ready;
        return Array.from(document.fonts)
          .filter((face) => face.status === 'loaded')
          .map((face) => `${face.family.replaceAll('"', '')}:${face.style}`);
      });
      for (const font of ['Manrope:normal', 'Cormorant Garamond:normal', 'Cormorant Garamond:italic']) {
        assert.ok(loadedFonts.includes(font), `${font} must load in the Worker-rendered page with external requests blocked`);
      }
      assert.match(await page.title(), /Манікюр і педикюр.*Київ/);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), origin + '/');
      await page.getByRole('button', { name: /01 Манікюр/ }).click();
      await page.getByText('777 грн', { exact: true }).waitFor();
      assert.ok(await page.locator('.gallery-slide').count() >= initialGallery.length);
      await page.locator('.gallery-slide img').first().evaluate((image: HTMLImageElement) => image.decode());
      assert.deepEqual(hydrationErrors, [], 'Server and browser must render the same public content');
      publicApiUnavailable = false;
      const clickResponse = page.waitForResponse('**/api/analytics');
      await page.locator('.hero [data-analytics="booking"]').click();
      assert.equal((await clickResponse).status(), 204);
      await page.goto(origin + '/admin');
      await page.getByRole('button', { name: 'Статистика', exact: true }).click();
      await page.getByRole('table').first().waitFor();
      assert.ok((await page.locator('.analytics-totals').last().innerText()).includes('Записатися\n3'));
      assert.ok((await page.locator('.analytics-totals').first().innerText()).includes('Візити\n8'));
      await page.getByText('За даними Cloudflare, цей звіт отримано без вибірки.').waitFor();
      await page.getByLabel('Період').selectOption('30');
      await page.getByText('Cloudflare застосував вибірку:', { exact: false }).waitFor();
      assert.ok((await page.locator('.analytics-totals').first().innerText()).includes('Візити\n12'));
      await page.getByLabel('Період').selectOption('7');
      await page.getByRole('table').first().waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: 'output/analytics-visits-mobile.png', fullPage: true });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.screenshot({ path: 'output/analytics-visits-desktop.png', fullPage: true });
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
