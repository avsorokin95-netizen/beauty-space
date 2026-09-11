import type { Express } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { studioSeo } from '../shared/seo.ts';
import type { ContactDocument } from '../shared/contacts.ts';
import type { PriceDocument } from '../shared/pricing.ts';

const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

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
    const { contacts } = snapshot;
    const seo = studioSeo(contacts, origin);
    const meta = [
      `<title>${escape(seo.title)}</title>`,
      `<meta name="description" content="${escape(seo.description)}">`,
      `<meta name="robots" content="${origin ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'}">`,
      '<meta property="og:type" content="website">', '<meta property="og:locale" content="uk_UA">',
      '<meta property="og:site_name" content="Beauty Space Victoriya">',
      `<meta property="og:title" content="${escape(seo.title)}">`,
      `<meta property="og:description" content="${escape(seo.description)}">`,
      '<meta name="twitter:card" content="summary_large_image">',
      `<meta name="twitter:title" content="${escape(seo.title)}">`,
      `<meta name="twitter:description" content="${escape(seo.description)}">`,
      ...(seo.url && seo.image ? [
        `<link rel="canonical" href="${escape(seo.url)}">`,
        `<meta property="og:url" content="${escape(seo.url)}">`,
        `<meta property="og:image" content="${escape(seo.image)}">`,
        '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">',
        '<meta property="og:image:alt" content="Beauty Space Victoriya — твій простір краси">',
        `<meta name="twitter:image" content="${escape(seo.image)}">`,
      ] : []),
      `<script type="application/ld+json" id="studio-schema">${json(seo.schema)}</script>`,
      `<script type="application/json" id="studio-contacts">${json(snapshot)}</script>`,
      '<link rel="preload" as="image" href="/images/manicure.webp" fetchpriority="high">',
    ].join('\n');
    const row = db.prepare('SELECT prices FROM revisions ORDER BY revision DESC LIMIT 1').get()!;
    const prices = JSON.parse(String(row.prices)) as PriceDocument['prices'];
    const items = Object.values(prices).flatMap((category) => category.items).map((item) => `<li>${escape(item.name)} — ${escape(item.price)}</li>`).join('');
    const fallback = `<noscript><main><h1>${escape(seo.title)}</h1><p>${escape(seo.description)}</p><h2>Послуги та ціни</h2><ul>${items}</ul><h2>Контакти й запис</h2><p>${escape(contacts.address)}, ${escape(contacts.city)}</p><p><a href="tel:${escape(contacts.phone)}">${escape(contacts.phone)}</a></p><a href="${escape(contacts.direct)}">Записатися онлайн</a> · <a href="${escape(contacts.instagram)}">Instagram</a> · <a href="${escape(contacts.telegram)}">Telegram</a></main></noscript>`;
    const html = readFileSync(join(directory, 'index.html'), 'utf8')
      .replace(/<title>[\s\S]*?<\/title>/, '')
      .replace(/<meta\s+(?:name="description"|property="og:[^"]+")[\s\S]*?>/g, '')
      .replace('</head>', () => `${meta}\n</head>`)
      .replace(/<noscript[\s\S]*?<\/noscript\s*>/, () => fallback);
    res.set('Cache-Control', 'no-cache');
    if (!origin) res.set('X-Robots-Tag', 'noindex, nofollow');
    res.type('html').send(html);
  });
}
