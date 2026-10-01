import { isPublicPath } from './pages.ts';
/** Relevant aliases only; unknown and removed content stays a real 404. */
export function canonicalPath(path: string): string | undefined {
  if (path === '/index.html') return '/';
  const clean = path.replace(/\/index\.html$/, '').replace(/\/$/, '');
  if (clean === '/manicure') return '/';
  if (clean === '/lashes') return '/laminuvannia-vii';
  if (clean !== path && isPublicPath(clean)) return clean;
  return undefined;
}
