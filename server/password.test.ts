import { randomBytes, scryptSync } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './app.ts';
import { initializeCredentials, readCredentials, verifyPassword } from './auth.ts';

test('password rotation validates current password, persists hash and revokes every session', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'beauty-password-'));
  initializeCredentials(directory);
  const oldPassword = readFileSync(join(directory, 'admin-access.txt'), 'utf8').match(/Password: (.+)/)![1];
  const newPassword = 'Test-only new password 2026!';
  const ownerPassword = randomBytes(24).toString('base64url');
  const ownerSalt = randomBytes(16).toString('hex');
  writeFileSync(join(directory, 'owner-auth.json'), JSON.stringify({ salt: ownerSalt, hash: scryptSync(ownerPassword, ownerSalt, 64).toString('hex') }), { mode: 0o600 });
  const origin = 'http://localhost:5173';
  const { app, store } = createApp({ directory, origins: [origin] });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  const login = (password: string) => fetch(base + '/api/login', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
  const change = (cookie: string, body: unknown, requestOrigin = origin) => fetch(base + '/api/admin/password', { method: 'PUT', headers: { Cookie: cookie, Origin: requestOrigin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const body = { currentPassword: oldPassword, newPassword, confirmation: newPassword };
  try {
    assert.equal((await change('', body)).status, 401);
    const first = (await login(oldPassword)).headers.get('set-cookie')!.split(';')[0];
    const second = (await login(oldPassword)).headers.get('set-cookie')!.split(';')[0];
    assert.equal((await change(first, body, 'https://foreign.example')).status, 403);
    for (const patch of [{ currentPassword: 'incorrect' }, { newPassword: 'short', confirmation: 'short' }, { confirmation: 'mismatch' }, { newPassword: oldPassword, confirmation: oldPassword }]) {
      assert.equal((await change(first, { ...body, ...patch })).status, 400);
      assert.ok(verifyPassword(oldPassword, readCredentials(directory)));
    }
    const stale = store.db.prepare('SELECT * FROM sessions LIMIT 1').get()!;
    const result = await change(first, body);
    assert.equal(result.status, 204);
    assert.match(result.headers.get('set-cookie')!, /Expires=Thu, 01 Jan 1970/);
    for (const cookie of [first, second]) assert.equal((await fetch(base + '/api/admin/session', { headers: { Cookie: cookie } })).status, 401);
    assert.equal((await login(oldPassword)).status, 401);
    assert.equal((await login(newPassword)).status, 200);
    assert.ok(verifyPassword(newPassword, readCredentials(directory)));
    assert.ok(!readFileSync(join(directory, 'auth.json'), 'utf8').includes(newPassword));
    assert.equal(statSync(join(directory, 'auth.json')).mode & 0o777, 0o600);
    assert.equal(existsSync(join(directory, 'admin-access.txt')), false);
    // Even a stale session restored after a partial failure cannot use the old credential generation.
    store.db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(stale.hash, stale.expires, stale.credential_hash);
    for (const cookie of [first, second]) assert.equal((await fetch(base + '/api/admin/session', { headers: { Cookie: cookie } })).status, 401);
    const ownerLogin = await login(ownerPassword);
    assert.equal(ownerLogin.status, 200);
    const ownerCookie = ownerLogin.headers.get('set-cookie')!.split(';')[0];
    assert.equal((await change(ownerCookie, { currentPassword: ownerPassword, newPassword: oldPassword, confirmation: oldPassword })).status, 204);
    const ownerAgain = await login(ownerPassword);
    assert.equal(ownerAgain.status, 200);
    const ownerSession = ownerAgain.headers.get('set-cookie')!.split(';')[0];
    rmSync(join(directory, 'owner-auth.json'));
    assert.equal((await login(ownerPassword)).status, 401);
    assert.equal((await fetch(base + '/api/admin/session', { headers: { Cookie: ownerSession } })).status, 401);
    assert.equal((await login(oldPassword)).status, 200);
    const reopened = createApp({ directory, origins: [origin] });
    reopened.store.db.close();
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    store.db.close(); rmSync(directory, { recursive: true, force: true });
  }
});
