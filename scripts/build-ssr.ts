import { build } from 'esbuild';

// Keep executable server code outside the directory served as public assets.
await build({
  entryPoints: ['src/entry-server.tsx'],
  outfile: '.server/render-public.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  packages: 'external',
  jsx: 'automatic',
});
