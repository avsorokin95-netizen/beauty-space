import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));
const { APP_ORIGIN, ACCESS_TEAM_DOMAIN, ACCESS_AUD } = config.vars;
if (!APP_ORIGIN || !/^https:\/\/[a-z0-9.-]+$/.test(APP_ORIGIN)) throw new Error('Configure APP_ORIGIN with the public HTTPS origin, without trailing slash.');
if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(ACCESS_TEAM_DOMAIN)) throw new Error('Configure ACCESS_TEAM_DOMAIN after creating the Access application.');
if (!/^[a-f0-9]{64}$/.test(ACCESS_AUD)) throw new Error('Configure ACCESS_AUD from the Access application settings.');
if (config.d1_databases[0].database_id === '00000000-0000-0000-0000-000000000000') throw new Error('Create and configure the D1 database.');
console.log('Cloudflare deployment configuration is ready.');
