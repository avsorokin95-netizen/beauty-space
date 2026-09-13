/** Public rendering resources must remain crawlable; admin stays private. */
export function robotsText(origin?: string) {
  return origin
    ? `User-agent: *\nAllow: /\nDisallow: /api/\nAllow: /api/prices$\nAllow: /api/contacts$\nAllow: /api/gallery$\nAllow: /api/media/\nDisallow: /admin\nSitemap: ${origin}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n';
}
