import type { Express } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderSeo } from '../shared/render-seo.ts';
import type { ContactDocument } from '../shared/contacts.ts';
import { robotsText } from '../shared/robots.ts';
import { sitemapXml } from '../shared/sitemap.ts';
import { canonicalPath } from '../shared/redirects.ts';
import { renderPublicApp } from './render-public.ts';

export function registerSeo(app: Express, db: DatabaseSync, directory: string, origin?: string) {
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { next(); return; }
    const path = canonicalPath(req.path);
    if (path) { res.redirect(301, path + req.url.slice(req.path.length)); return; }
    next();
  });
  const readContacts = (): ContactDocument => {
    const row = db.prepare('SELECT * FROM contact_revisions ORDER BY revision DESC LIMIT 1').get()!;
    return { revision: Number(row.revision), updatedAt: String(row.updated_at), contacts: JSON.parse(String(row.contacts)) };
  };
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send(robotsText(origin));
  });
  app.get('/sitemap.xml', (_req, res) => {
    if (!origin) { res.status(404).type('text/plain').send('Public domain is not configured.'); return; }
    res.type('application/xml').send(sitemapXml(origin));
  });
  app.get(['/admin', '/admin/'], (_req, res) => {
    const html = readFileSync(join(directory, 'index.html'), 'utf8')
      .replace(/<title>[\s\S]*?<\/title>/, '<title>Керування студією — Beauty Space Victoriya</title>')
      .replace('</head>', '<meta name="robots" content="noindex, nofollow, noarchive"></head>');
    res.set({ 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Cache-Control': 'no-store' }).type('html').send(html);
  });
  app.get('/', async (_req, res) => {
    const snapshot = readContacts();
    const row = db.prepare('SELECT * FROM revisions ORDER BY revision DESC LIMIT 1').get()!;
    const galleryRow = db.prepare('SELECT * FROM gallery_revisions ORDER BY revision DESC LIMIT 1').get()!;
    const prices = { revision: Number(row.revision), updatedAt: String(row.updated_at), prices: JSON.parse(String(row.prices)) };
    const gallery = { revision: Number(galleryRow.revision), updatedAt: String(galleryRow.updated_at), items: JSON.parse(String(galleryRow.items)) };
    const body = await renderPublicApp({ contacts: snapshot, prices, gallery });
    const html = renderSeo(readFileSync(join(directory, 'index.html'), 'utf8'), snapshot, prices.prices, origin, {
      prices, gallery,
    }, body);
    res.set('Cache-Control', 'no-cache');
    if (!origin) res.set('X-Robots-Tag', 'noindex, nofollow');
    res.type('html').send(html);
  });
}
