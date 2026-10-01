import type { PublicPath } from '../shared/pages.ts';
import type { PublicSnapshot } from '../shared/public-snapshot.ts';

type PublicRenderer = { renderPublicApp(snapshot: PublicSnapshot, path: PublicPath): string };
let renderer: Promise<PublicRenderer> | undefined;

/** Load the JSX build once; the deployment only serves files inside dist/. */
export async function renderPublicApp(snapshot: PublicSnapshot, path: PublicPath = '/'): Promise<string> {
  const moduleUrl = new URL('../.server/render-public.mjs', import.meta.url).href;
  renderer ??= import(moduleUrl) as Promise<PublicRenderer>;
  return (await renderer).renderPublicApp(snapshot, path);
}
