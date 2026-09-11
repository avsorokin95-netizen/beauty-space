import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './app.ts';
import { initializeCredentials } from './auth.ts';
import type { ContactDocument } from '../shared/contacts.ts';

test('contacts require session and origin, validate input, reject conflicts and persist', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'beauty-contacts-'));
  initializeCredentials(directory);
  const password = readFileSync(join(directory, 'admin-access.txt'), 'utf8').match(/Password: (.+)/)![1];
  const origin = 'http://localhost:5173';
  const { app, store } = createApp({ directory, origins: [origin] });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  let cookie = '';
  const save = (data: unknown, requestOrigin = origin) => fetch(base + '/api/admin/contacts', { method: 'PUT', headers: { Origin: requestOrigin, Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  try {
    const initial = await (await fetch(base + '/api/contacts')).json() as ContactDocument;
    assert.equal(initial.contacts.phone, '+380939314056');
    assert.equal((await save(initial)).status, 401);
    const login = await fetch(base + '/api/login', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    cookie = login.headers.get('set-cookie')!.split(';')[0];
    assert.equal((await save(initial, 'https://foreign.example')).status, 403);
    for (const patch of [{ phone: '123' }, { address: '' }, { city: 'x'.repeat(101) }, { instagram: 'javascript:alert(1)' }, { direct: 'https://evil.example/m/test' }, { telegram: 'https://t.me.evil.example/test' }, { reviews: 'https://www.instagram.com/p/test/' }]) {
      assert.equal((await save({ ...initial, contacts: { ...initial.contacts, ...patch } })).status, 400);
    }
    const draft = { ...initial, contacts: { ...initial.contacts, phone: '+380501234567', city: 'Київ' } };
    assert.equal((await save(draft)).status, 200);
    assert.equal((await save(draft)).status, 409);
    const current = await (await fetch(base + '/api/contacts')).json() as ContactDocument;
    assert.deepEqual(current.contacts, draft.contacts);
    const reopened = createApp({ directory, origins: [origin] });
    const row = reopened.store.db.prepare('SELECT contacts FROM contact_revisions ORDER BY revision DESC LIMIT 1').get()!;
    assert.equal(JSON.parse(String(row.contacts)).phone, '+380501234567');
    reopened.store.db.close();
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    store.db.close(); rmSync(directory, { recursive: true, force: true });
  }
});
