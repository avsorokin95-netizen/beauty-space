import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { createApp } from './app.ts';
import { initializeCredentials } from './auth.ts';
import { MAX_GALLERY_ALT_LENGTH, validGalleryAlt, type GalleryDocument } from '../shared/gallery.ts';

test('gallery descriptions allow legacy omission and bounded text only', () => {
  for (const value of [undefined, '', 'Рожевий манікюр', 'а'.repeat(MAX_GALLERY_ALT_LENGTH)]) {
    assert.equal(validGalleryAlt(value), true);
  }
  for (const value of [null, 123, false, {}, [], 'а'.repeat(MAX_GALLERY_ALT_LENGTH + 1)]) {
    assert.equal(validGalleryAlt(value), false);
  }
});

test('gallery upload, validation, publication, conflict and disk persistence', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'beauty-gallery-'));
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
  const send = (path: string, body?: unknown) => fetch(base + path, { method: body ? 'PUT' : 'GET', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const photo = await sharp({ create: { width: 1900, height: 1100, channels: 3, background: '#dfbcb3' } }).png().toBuffer();
  const upload = (body: Buffer, type = 'image/png', requestOrigin = origin) => fetch(base + '/api/admin/gallery/upload', { method: 'POST', headers: { Cookie: cookie, Origin: requestOrigin, 'Content-Type': type }, body });
  try {
    const initial = await (await send('/api/gallery')).json() as GalleryDocument;
    assert.deepEqual(initial.items.slice(0, 3).map((item) => item.src), ['/images/DMH0_1XIG6e.webp', '/images/Daz8xsnCN4f.webp', '/images/DNm6R3Qo2oO.webp']);
    assert.equal((await upload(photo)).status, 401);
    assert.equal((await send('/api/admin/gallery', initial)).status, 401);
    const login = await fetch(base + '/api/login', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    cookie = login.headers.get('set-cookie')!.split(';')[0];
    assert.equal((await upload(photo, 'image/png', 'https://foreign.example')).status, 403);
    assert.equal((await upload(Buffer.from('<svg/>'), 'image/svg+xml')).status, 415);
    assert.equal((await upload(Buffer.from('not a photo'))).status, 415);
    assert.equal((await upload(Buffer.alloc(8 * 1024 * 1024 + 1))).status, 413);
    const uploaded = await upload(photo);
    assert.equal(uploaded.status, 201);
    const { src } = await uploaded.json() as { src: string };
    const media = await fetch(base + src);
    assert.equal(media.status, 200);
    assert.match(media.headers.get('content-type')!, /image\/webp/);
    const metadata = await sharp(Buffer.from(await media.arrayBuffer())).metadata();
    assert.equal(metadata.width, 1600);
    assert.equal(metadata.exif, undefined);
    assert.deepEqual(await (await send('/api/gallery')).json(), initial);
    const draft = structuredClone(initial);
    draft.items[0] = { ...draft.items[0], src, title: 'Нова робота', alt: '  Рожеве покриття на коротких нігтях  ', instagram: '' };
    delete draft.items[1].alt;
    for (const patch of [{ src: '/api/media/../../auth.json' }, { src: 'https://example.com/image.jpg' }, { instagram: 'javascript:alert(1)' }, { title: '' }, { id: 'fake' },
      ...[null, 123, false, {}, [], 'а'.repeat(MAX_GALLERY_ALT_LENGTH + 1)].map((alt) => ({ alt }))]) {
      const invalid = structuredClone(draft); Object.assign(invalid.items[0], patch);
      assert.equal((await send('/api/admin/gallery', invalid)).status, 400);
    }
    const duplicate = structuredClone(draft); duplicate.items[1].id = duplicate.items[0].id;
    assert.equal((await send('/api/admin/gallery', duplicate)).status, 400);
    const empty = { ...draft, items: [] };
    assert.equal((await send('/api/admin/gallery', empty)).status, 400);
    draft.items = [draft.items[0], { ...draft.items[1], id: 'work-new-photo' }];
    assert.equal((await send('/api/admin/gallery', draft)).status, 200);
    assert.equal((await send('/api/admin/gallery', draft)).status, 409);
    const saved = await (await send('/api/gallery')).json() as GalleryDocument;
    assert.equal(saved.items[0].src, src);
    assert.equal(saved.items[0].title, 'Нова робота');
    assert.equal(saved.items[0].alt, 'Рожеве покриття на коротких нігтях');
    assert.equal(Object.hasOwn(saved.items[1], 'alt'), false, 'Legacy items may omit the description');
    const reopened = createApp({ directory, origins: [origin] });
    const row = reopened.store.db.prepare('SELECT items FROM gallery_revisions ORDER BY revision DESC LIMIT 1').get()!;
    assert.equal(JSON.parse(String(row.items))[0].src, src);
    assert.equal(JSON.parse(String(row.items))[0].alt, saved.items[0].alt, 'Custom descriptions survive a server restart');
    assert.equal(Object.hasOwn(JSON.parse(String(row.items))[1], 'alt'), false);
    assert.equal(JSON.parse(String(row.items)).length, 2);
    assert.ok(readFileSync(join(directory, 'media', src.split('/').pop()!)).length);
    reopened.store.db.close();
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    store.db.close(); rmSync(directory, { recursive: true, force: true });
  }
});
