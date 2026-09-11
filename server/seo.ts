import type { Express } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderSeo } from '../shared/render-seo.ts';
import type { ContactDocument } from '../shared/contacts.ts';

const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

export function registerSeo(app: Express, db: DatabaseSync, directory: string, origin?: string) {
  const readContacts = (): ContactDocument => {
    const row = db.prepare('SELECT * FROM contact_revisions ORDER BY revision DESC LIMIT 1').get()!;
    return { revision: Number(row.revision), updatedAt: String(row.updated_at), contacts: JSON.parse(String(row.contacts)) };
  };
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send(origin
      ? `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`
      : 'User-agent: *\nDisallow: /\n');
  });
  app.get('/sitemap.xml', (_req, res) => {
    if (!origin) { res.status(404).type('text/plain').send('Public domain is not configured.'); return; }
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escape(origin)}/</loc></url></urlset>`);
  });
  app.get(['/admin', '/admin/'], (_req, res) => {
    const html = readFileSync(join(directory, 'index.html'), 'utf8')
      .replace(/<title>[\s\S]*?<\/title>/, '<title>Керування студією — Beauty Space Victoriya</title>')
      .replace('</head>', '<meta name="robots" content="noindex, nofollow, noarchive"></head>');
    res.set({ 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Cache-Control': 'no-store' }).type('html').send(html);
  });
  app.get('/index.html', (_req, res) => res.redirect(301, '/'));
  app.get('/', (_req, res) => {
    const snapshot = readContacts();
    const row = db.prepare('SELECT prices FROM revisions ORDER BY revision DESC LIMIT 1').get()!;
    const html = renderSeo(readFileSync(join(directory, 'index.html'), 'utf8'), snapshot, JSON.parse(String(row.prices)), origin);
    res.set('Cache-Control', 'no-cache');
    if (!origin) res.set('X-Robots-Tag', 'noindex, nofollow');
    res.type('html').send(html);
  });
}
