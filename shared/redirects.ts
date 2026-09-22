/** The homepage is the only public page; unknown URLs must remain real 404s. */
export function canonicalPath(path: string): string | undefined {
  return path === '/index.html' ? '/' : undefined;
}
