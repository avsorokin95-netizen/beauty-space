import { publicPages } from './pages.ts';
export function sitemapXml(origin: string) {
  const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  // No fabricated lastmod: content/code changes have no single reliable timestamp.
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.keys(publicPages).map((path) => `<url><loc>${escape(origin + path)}</loc></url>`).join('')}</urlset>`;
}
