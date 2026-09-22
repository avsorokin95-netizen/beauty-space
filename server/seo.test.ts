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
    assert.match(html, /<title>Манікюр · ЖК «Софія», Софіївська Борщагівка \| Beauty Space Victoriya<\/title>/);
    assert.match(html, /property="og:title" content="Манікюр · ЖК «Софія», Софіївська Борщагівка \| Beauty Space Victoriya"/);
    assert.match(html, /name="twitter:title" content="Манікюр · ЖК «Софія», Софіївська Борщагівка \| Beauty Space Victoriya"/);
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
    assert.match(html, /запрошуємо мешканців ЖК «Софія» та Вишневого/);
    assert.match(html, /ЖК «Софія»/);
    assert.match(html, /Скільки коштує манікюр/);
    assert.match(html, /Манікюр і педикюр у Софіївській Борщагівці/);
    assert.match(html, /Як приїхати до студії з ЖК «Софія» або Вишневого/);
    const schema = JSON.parse(html.match(/id="studio-schema">(.*?)<\/script>/)![1]);
    assert.equal(schema['@type'], 'BeautySalon');
    assert.equal(schema.telephone, '+380939314056');
    assert.equal(schema.address.addressLocality, 'Софіївська Борщагівка');
    const graph = JSON.parse(html.match(/id="page-schema">(.*?)<\/script>/)![1])['@graph'];
    const serviceSchemas = graph.filter((item: { '@type': string }) => item['@type'] === 'Service');
    assert.deepEqual(serviceSchemas.map((item: { name: string }) => item.name), ['Манікюр', 'Педикюр', 'Ламінування та фарбування вій']);
    for (const service of serviceSchemas) {
      assert.equal(service.provider['@id'], `${origin}/#studio`);
      assert.deepEqual(service.areaServed.map((area: { name: string }) => area.name), ['Софіївська Борщагівка', 'Вишневе']);
      assert.ok(html.includes(`id="${new URL(service.url).hash.slice(1)}"`));
    }
    assert.equal(new URL(schema.hasMap).searchParams.get('query_place_id'), 'ChIJey2Ar-TL1EARuk3pdFrpkJ0');
    assert.match(html, /maps\/embed\?pb=/);
    assert.match(html, /0x40d4cbe4af802d7b%3A0x9d90e95a74e94dba/);
    assert.match(schema.description, /Софіївська Борщагівка/);
    assert.equal(schema.aggregateRating, undefined);
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
    assert.equal((sitemap.match(/<loc>/g) ?? []).length, 1);
    for (const catalog of schema.hasOfferCatalog.itemListElement) {
      for (const offer of catalog.itemListElement) assert.equal(offer.url, `${origin}/#services`);
    }
    for (const slug of ['manicure', 'pedicure', 'brows', 'lashes']) {
      assert.ok(!html.includes(`href="/${slug}`), `The homepage must not link to the removed ${slug} route`);
      assert.ok(!sitemap.includes(`/${slug}`));
      for (const path of [`/${slug}`, `/${slug}/`, `/${slug}/index.html`]) {
        const response = await fetch(base + path + '?utm_source=instagram', { redirect: 'manual' });
        assert.equal(response.status, 404, `${path} must not serve or redirect to a removed page`);
      }
    }
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
    const priceRow = store.db.prepare('SELECT * FROM revisions ORDER BY revision DESC LIMIT 1').get()!;
    const prices = JSON.parse(String(priceRow.prices));
    prices.nails.items[0].price = '777 грн';
    store.db.prepare('INSERT INTO revisions VALUES (?, ?, ?)').run(Number(priceRow.revision) + 1, new Date().toISOString(), JSON.stringify(prices));
    const updatedPrices = await (await fetch(base + '/')).text();
    assert.match(updatedPrices, /777 грн/);
    assert.match(updatedPrices, /"price":777/);
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
