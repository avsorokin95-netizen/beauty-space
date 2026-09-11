import { readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const remote = process.argv.includes('--remote');
const directory = resolve('.cloudflare-private/media');
for (const name of readdirSync(directory)) {
  if (!/^[0-9a-f-]{36}\.webp$/.test(name)) throw new Error('Unexpected export file');
  const result = spawnSync('npx', ['wrangler', 'r2', 'object', 'put', `beauty-space-media/${name}`, '--file', join(directory, name), '--content-type', 'image/webp', remote ? '--remote' : '--local'], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Gallery media uploaded (${remote ? 'remote' : 'local'}).`);
