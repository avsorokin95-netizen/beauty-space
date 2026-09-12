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
    assert.match(html, /<title>Манікюр.*Софіївська Борщагівка.*Beauty Space Victoriya<\/title>/);
    assert.match(html, /rel="canonical" href="https:\/\/beauty.example\/"/);
    assert.match(html, /property="og:image" content="https:\/\/beauty.example\/images\/social-preview.jpg"/);
    assert.match(html, /name="twitter:card" content="summary_large_image"/);
    assert.equal((html.match(/name="description"/g) ?? []).length, 1);
    assert.match(html, /<noscript><main><h1>/);
    assert.match(html, /Манікюр без покриття/);
    assert.match(html, /Шукаєш манікюр у Вишневому/);
    assert.match(html, /ЖК «Софія»/);
    assert.match(html, /Скільки коштує манікюр/);
    const schema = JSON.parse(html.match(/id="studio-schema">(.*?)<\/script>/)![1]);
    assert.equal(schema['@type'], 'BeautySalon');
    assert.equal(schema.telephone, '+380939314056');
    assert.equal(schema.aggregateRating, undefined);
    assert.equal(schema.openingHoursSpecification[0].dayOfWeek.length, 7);
    assert.equal(schema.openingHoursSpecification[0].opens, '09:00');
    assert.equal(schema.openingHoursSpecification[0].closes, '18:00');
    assert.match(html, /Щодня, 09:00–18:00/);
    assert.match(await (await fetch(base + '/robots.txt')).text(), /Sitemap: https:\/\/beauty.example\/sitemap.xml/);
    const sitemap = await (await fetch(base + '/sitemap.xml')).text();
    assert.match(sitemap, /<loc>https:\/\/beauty.example\/<\/loc>/);
    assert.ok(!sitemap.includes('admin'));
    for (const path of ['/admin', '/admin/']) {
      const admin = await fetch(base + path);
      assert.match(admin.headers.get('x-robots-tag')!, /noindex/);
      assert.match(await admin.text(), /name="robots" content="noindex/);
    }
    assert.equal((await fetch(base + '/missing-page')).status, 404);
    assert.equal((await fetch(base + '/index.html', { redirect: 'manual' })).status, 301);
    const row = store.db.prepare('SELECT * FROM contact_revisions ORDER BY revision DESC LIMIT 1').get()!;
    const contacts = JSON.parse(String(row.contacts));
    contacts.city = 'Київ'; contacts.address = 'вул. <script>alert(1)</script> $&';
    store.db.prepare('INSERT INTO contact_revisions VALUES (?, ?, ?)').run(Number(row.revision) + 1, new Date().toISOString(), JSON.stringify(contacts));
    const updated = await (await fetch(base + '/')).text();
    assert.match(updated, /Київ \| Beauty Space Victoriya<\/title>/);
    assert.ok(!updated.includes('<script>alert(1)</script>'));
    assert.ok(updated.includes('&lt;script&gt;alert(1)&lt;/script&gt; $&amp;'));
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    store.db.close(); rmSync(directory, { recursive: true, force: true });
  }
});
