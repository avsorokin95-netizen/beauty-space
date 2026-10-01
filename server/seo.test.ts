import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './app.ts';
import { initializeCredentials } from './auth.ts';

test('production SEO uses published data in HTML and excludes admin from indexing', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'beauty-seo-'));
  initializeCredentials(directory);
  writeFileSync(join(directory, 'index.html'), readFileSync('index.html'));
  const origin = 'https://beauty.example';
  const { app, store } = createApp({ directory, origins: [origin], publicOrigin: origin, production: true, staticDirectory: directory });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const response = await fetch(base + '/');
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /<title>Манікюр · Софіївська Борщагівка \| Beauty Space Victoriya<\/title>/);
    assert.match(html, /property="og:title" content="Манікюр · Софіївська Борщагівка \| Beauty Space Victoriya"/);
    assert.match(html, /name="twitter:title" content="Манікюр · Софіївська Борщагівка \| Beauty Space Victoriya"/);
    assert.match(html, /rel="canonical" href="https:\/\/beauty.example\/"/);
    assert.match(html, /property="og:image" content="https:\/\/beauty.example\/images\/social-preview.jpg"/);
    assert.match(html, /name="twitter:card" content="summary_large_image"/);
    assert.equal((html.match(/name="description"/g) ?? []).length, 1);
    assert.match(html, /<div id="root">[\s\S]*<main/);
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1);
    assert.ok(!html.includes('<noscript'), 'Public content is rendered normally, not hidden in a noscript fallback');
    const bootPrices = JSON.parse(html.match(/id="studio-prices">(.*?)<\/script>/)![1]);
    assert.equal(bootPrices.prices.nails.items[0].price, '550 грн');
    const bootGallery = JSON.parse(html.match(/id="studio-gallery">(.*?)<\/script>/)![1]);
    assert.ok(bootGallery.items.length > 0);
    assert.match(html, /Манікюр без покриття/);
    assert.match(html, /Якщо ти їдеш із ЖК «Софія» або Вишневого/);
    assert.match(html, /ЖК «Софія»/);
    assert.match(html, /Де подивитися вартість/);
    assert.match(html, /Манікюр у Софіївській Борщагівці/);
    assert.match(html, /Як знайти студію/);
    const schema = JSON.parse(html.match(/id="studio-schema">(.*?)<\/script>/)![1]);
    assert.equal(schema['@type'], 'BeautySalon');
    assert.equal(schema.telephone, '+380939314056');
    assert.equal(schema.address.addressLocality, 'Софіївська Борщагівка');
    const graph = JSON.parse(html.match(/id="page-schema">(.*?)<\/script>/)![1])['@graph'];
    const serviceSchemas = graph.filter((item: { '@type': string }) => item['@type'] === 'Service');
    assert.deepEqual(serviceSchemas.map((item: { name: string }) => item.name), ['Манікюр у Софіївській Борщагівці']);
    for (const service of serviceSchemas) {
      assert.equal(service.provider['@id'], `${origin}/#studio`);
      assert.equal(service.areaServed.name, 'Софіївська Борщагівка');
      assert.equal(service.url, origin + "/");
    }
    assert.equal(new URL(schema.hasMap).searchParams.get('query_place_id'), 'ChIJey2Ar-TL1EARuk3pdFrpkJ0');
    assert.match(html, /maps\/embed\?pb=/);
    assert.match(html, /0x40d4cbe4af802d7b%3A0x9d90e95a74e94dba/);

    assert.equal(schema.aggregateRating, undefined);
    assert.deepEqual(schema.geo, { '@type': 'GeoCoordinates', latitude: 50.3999287, longitude: 30.375247 });
    assert.equal(schema.address.postalCode, '08131');
    assert.equal(schema.openingHoursSpecification[0].dayOfWeek.length, 7);
    assert.equal(schema.openingHoursSpecification[0].opens, '09:00');
    assert.equal(schema.openingHoursSpecification[0].closes, '18:00');
    assert.equal(schema.hasOfferCatalog.itemListElement[0].itemListElement[0].price, 550);
    const slashOffer = schema.hasOfferCatalog.itemListElement[0].itemListElement.find((offer: { description: string }) => offer.description.endsWith('50/70 грн'));
    assert.ok(slashOffer);
    assert.equal(slashOffer.price, undefined, 'Ambiguous variants must not become a single claimed price');
    assert.match(html, /Щодня, 09:00–18:00/);
    assert.match(await (await fetch(base + '/robots.txt')).text(), /Sitemap: https:\/\/beauty.example\/sitemap.xml/);
    const robots = await (await fetch(base + '/robots.txt')).text();
    for (const resource of ['prices', 'contacts', 'gallery']) assert.ok(robots.includes(`Allow: /api/${resource}$`));
    assert.ok(robots.includes('Allow: /api/media/'));
    assert.ok(robots.includes('Disallow: /admin'));
    const sitemap = await (await fetch(base + '/sitemap.xml')).text();
    assert.match(sitemap, /<loc>https:\/\/beauty.example\/<\/loc>/);
    assert.ok(!sitemap.includes('admin'));
    assert.equal((sitemap.match(/<loc>/g) ?? []).length, 3);
    for (const catalog of schema.hasOfferCatalog.itemListElement) {
      for (const offer of catalog.itemListElement) assert.ok(offer.url.startsWith(`${origin}/#service-`));
    }
    for (const [path, heading] of [['/pedicure', 'Педикюр'], ['/laminuvannia-vii', 'Ламінування вій']]) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200);
      const content = await response.text();
      assert.ok(content.includes(`rel="canonical" href="${origin}${path}"`));
      assert.equal(content.match(/<h1\b[^>]*>(.*?)<\/h1>/)?.[1].replace(/<[^>]+>/g, ''), `${heading} у Софіївській Борщагівці`);
      assert.ok(html.includes(`href="${path}"`));
      assert.ok(sitemap.includes(`<loc>${origin}${path}</loc>`));
      const description = content.match(/<meta name="description" content="([^"]+)"/)?.[1];
      assert.ok(description?.includes(path === '/pedicure'
        ? 'Комплекс педикюр (Стопа + покриття) — 1 000 грн'
        : 'Ламінування вій — 700 грн'), 'Description includes the second published procedure and disambiguates complexes');
      if (path === '/pedicure') assert.ok(description?.includes('600/700 грн'), 'Do not guess the price of slash-separated variants');
      assert.match(content, new RegExp(`href="${path}" aria-current="page"`), 'Active service is present in initial HTML');
      assert.ok(content.includes('href="#services"') && content.includes('href="#gallery"'), 'Section links remain on the current service page');
      const navigation = content.match(/<nav\b[^>]*aria-label="Основна навігація"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
      assert.ok(navigation, 'Main navigation is present in initial HTML');
      assert.ok(!navigation.includes('href="/#services"') && !navigation.includes('href="/#gallery"') && !navigation.includes('href="/#contacts"'), 'Menu section links do not switch to manicure');
    }
    for (const [old, target] of [['/manicure', '/'], ['/lashes', '/laminuvannia-vii'], ['/pedicure/', '/pedicure'], ['/laminuvannia-vii/index.html', '/laminuvannia-vii']]) {
      const response = await fetch(base + old + '?utm_source=instagram', { redirect: 'manual' });
      assert.equal(response.status, 301);
      assert.equal(response.headers.get('location'), target + '?utm_source=instagram');
    }
    assert.equal((await fetch(base + '/brows')).status, 404);
    for (const path of ['/admin', '/admin/']) {
      const admin = await fetch(base + path);
      assert.match(admin.headers.get('x-robots-tag')!, /noindex/);
      assert.match(await admin.text(), /name="robots" content="noindex/);
    }
    assert.equal((await fetch(base + '/missing-page')).status, 404);
    assert.equal((await fetch(base + '/MANICURE/')).status, 404);
    assert.equal((await fetch(base + '/index.html', { redirect: 'manual' })).status, 301);
    const row = store.db.prepare('SELECT * FROM contact_revisions ORDER BY revision DESC LIMIT 1').get()!;
    const contacts = JSON.parse(String(row.contacts));
    contacts.city = 'Київ'; contacts.address = 'вул. <script>alert(1)</script> $&';
    store.db.prepare('INSERT INTO contact_revisions VALUES (?, ?, ?)').run(Number(row.revision) + 1, new Date().toISOString(), JSON.stringify(contacts));
    const updated = await (await fetch(base + '/')).text();
    assert.match(updated, /Київ \| Beauty Space Victoriya<\/title>/);
    assert.ok(!updated.includes('<script>alert(1)</script>'));
    assert.ok(updated.includes('&lt;script&gt;alert(1)&lt;/script&gt; $&amp;'));
    assert.ok(!updated.includes('Вишневого'));
    assert.ok(!updated.includes('Вишневе'));
    assert.ok(!updated.includes('ЖК «Софія»'));
    assert.ok(!updated.includes('ChIJey2Ar-TL1EARuk3pdFrpkJ0'));
    const movedSchema = JSON.parse(updated.match(/<script type="application\/ld\+json" id="studio-schema">([\s\S]*?)<\/script>/)![1]);
    assert.equal(movedSchema.geo, undefined, 'An edited location must not inherit the old coordinates');
    assert.equal(movedSchema.address.postalCode, undefined, 'An edited location must not inherit the old postal code');
    const priceRow = store.db.prepare('SELECT * FROM revisions ORDER BY revision DESC LIMIT 1').get()!;
    const prices = JSON.parse(String(priceRow.prices));
    prices.nails.items[0].price = '777 грн';
    prices.nails.items[1].name = 'Новий комплекс манікюру';
    prices.nails.items[1].price = '975 грн';
    store.db.prepare('INSERT INTO revisions VALUES (?, ?, ?)').run(Number(priceRow.revision) + 1, new Date().toISOString(), JSON.stringify(prices));
    const updatedPrices = await (await fetch(base + '/')).text();
    assert.match(updatedPrices, /777 грн/);
    assert.match(updatedPrices, /"price":777/);
    const updatedDescription = updatedPrices.match(/<meta name="description" content="([^"]+)"/)?.[1];
    assert.ok(updatedDescription?.includes('Манікюр без покриття — 777 грн'));
    assert.ok(updatedDescription?.includes('Новий комплекс манікюру — 975 грн'), 'Metadata must follow owner edits to both example procedures');
    assert.ok(!updatedDescription?.includes('900 грн'), 'Metadata must not retain the old complex price');
    assert.ok(!updatedPrices.includes('<script>alert(1)</script>'));
    assert.match(updatedPrices, /Київ/);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    store.db.close(); rmSync(directory, { recursive: true, force: true });
  }
});

test('unconfigured local origin keeps the homepage out of indexing', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'beauty-local-seo-'));
  initializeCredentials(directory);
  writeFileSync(join(directory, 'index.html'), readFileSync('index.html'));
  const { app, store } = createApp({ directory, origins: ['http://localhost'], staticDirectory: directory });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const response = await fetch(base + '/', { headers: { Host: 'untrusted.example' } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('x-robots-tag')!, /noindex/);
    const html = await response.text();
    assert.ok(!html.includes('rel="canonical"'));
    assert.ok(!html.includes('untrusted.example'));
    assert.match(html, /name="robots" content="noindex, nofollow"/);
    assert.equal((await fetch(base + '/sitemap.xml')).status, 404);
    assert.equal(await (await fetch(base + '/robots.txt')).text(), 'User-agent: *\nDisallow: /\n');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    store.db.close(); rmSync(directory, { recursive: true, force: true });
  }
});
