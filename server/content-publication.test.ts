import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { initializeCredentials } from './auth.ts';
import { createApp } from './app.ts';
import type { PriceDocument } from '../shared/pricing.ts';
import type { ContactDocument } from '../shared/contacts.ts';

test('owner service edits remain synchronized in SSR, metadata, schema and revision history', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'beauty-content-test-'));
  initializeCredentials(directory);
  const password = readFileSync(join(directory, 'admin-access.txt'), 'utf8').match(/Password: (.+)/)![1];
  const origin = 'http://127.0.0.1';
  const { app, store } = createApp({ directory, origins: [origin], publicOrigin: origin, staticDirectory: resolve('dist') });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((done) => server.once('listening', done));
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  let cookie = '';
  const send = (path: string, method = 'GET', body?: unknown) => fetch(base + path, { method, headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  try {
    const initial = await (await send('/api/prices')).json() as PriceDocument;
    const login = await send('/api/login', 'POST', { password });
    cookie = login.headers.get('set-cookie')!.split(';')[0];
    const draft = structuredClone(initial);
    draft.prices.pedicure.items = [{ name: 'Тестова процедура стопи', detail: 'Опублікований склад', price: '811 грн' }];
    draft.prices.pedicure.overview = 'Опис власниці: <тест> & догляд.';
    draft.prices.pedicure.booking = 'Уточни варіант перед візитом.';
    draft.prices.pedicure.note = 'Тестова примітка.';
    assert.equal((await send('/api/admin/prices', 'PUT', draft)).status, 200);
    assert.equal((await send('/api/admin/prices', 'PUT', draft)).status, 409);
    assert.equal(JSON.parse(String(store.db.prepare('SELECT prices FROM revisions WHERE revision = ?').get(initial.revision)!.prices)).pedicure.items.length, initial.prices.pedicure.items.length);
    for (const path of ['/', '/pedicure']) {
      const response = await send(path); assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes('Тестова процедура стопи'));
      assert.ok(html.includes('811 грн'));
      assert.ok(html.includes('Опис власниці: &lt;тест&gt; &amp; догляд.'));
      assert.ok(html.includes('Тестова примітка.'));
      const schema = JSON.parse(html.match(/id="studio-schema">(.*?)<\/script>/)![1]);
      const pedicure = schema.hasOfferCatalog.itemListElement.find((item: { name: string }) => item.name === 'Педикюр');
      assert.equal(pedicure.itemListElement.length, 1);
      assert.equal(pedicure.itemListElement[0].itemOffered.name, 'Тестова процедура стопи');
      assert.equal(pedicure.itemListElement[0].price, 811);
      if (path === '/pedicure') assert.match(html, /name="description" content="[^"]*811 грн/);
    }
    const contacts = await (await send('/api/contacts')).json() as ContactDocument;
    contacts.contacts.hours = '';
    contacts.contacts.floor = 'Вхід із тестового двору';
    contacts.contacts.directionsVideo = '';
    contacts.contacts.introduction = 'Опублікований опис студії.';
    assert.equal((await send('/api/admin/contacts', 'PUT', contacts)).status, 200);
    for (const path of ['/', '/pedicure', '/laminuvannia-vii']) {
      const html = await (await send(path)).text();
      assert.ok(html.includes('Вхід із тестового двору') && html.includes('Опублікований опис студії.'));
      assert.ok(!html.includes('Щодня, 09:00–18:00'));
      const schema = JSON.parse(html.match(/id="studio-schema">(.*?)<\/script>/)![1]);
      assert.equal(schema.openingHoursSpecification, undefined);
      assert.ok(!html.includes('href="https://www.instagram.com/p/DJKIbxLokSO/"'));
    }
    const current = await (await send('/api/prices')).json() as PriceDocument;
    current.prices.pedicure.items[0].name = '';
    assert.equal((await send('/api/admin/prices', 'PUT', current)).status, 400);
    current.prices.pedicure.items[0].name = 'Валідна назва';
    current.prices.pedicure.overview = 'а'.repeat(1201);
    assert.equal((await send('/api/admin/prices', 'PUT', current)).status, 400);
    for (const path of ['/PEDICURE', '/pedicure/unknown', '/missing']) assert.equal((await send(path)).status, 404);
  } finally {
    await new Promise<void>((done) => server.close(() => done()));
    store.db.close(); rmSync(directory, { recursive: true, force: true });
  }
});
