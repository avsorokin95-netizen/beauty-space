import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

// Export published content only. Passwords, sessions and private access files
// must never be transferred to the email-authenticated Cloudflare deployment.
const directory = resolve(process.env.DATA_DIR || '.data');
const output = resolve('.cloudflare-private');
mkdirSync(join(output, 'media'), { recursive: true, mode: 0o700 });
const db = new DatabaseSync(join(directory, 'studio.sqlite'), { readOnly: true });
const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
const statements: string[] = [];
try {
  for (const [kind, table, field] of [
    ['prices', 'revisions', 'prices'], ['contacts', 'contact_revisions', 'contacts'], ['gallery', 'gallery_revisions', 'items'],
  ]) {
    const row = db.prepare(`SELECT * FROM ${table} ORDER BY revision DESC LIMIT 1`).get();
    if (!row) throw new Error(`Missing published ${kind}`);
    const data = String(row[field]);
    JSON.parse(data);
    statements.push(`INSERT INTO documents (kind, revision, updated_at, data) VALUES (${quote(kind)}, ${Number(row.revision)}, ${quote(String(row.updated_at))}, ${quote(data)}) ON CONFLICT(kind) DO NOTHING;`);
    if (kind === 'gallery') {
      for (const item of JSON.parse(data)) {
        if (!item.src.startsWith('/api/media/')) continue;
        const name = item.src.slice('/api/media/'.length);
        if (!/^[0-9a-f-]{36}\.webp$/.test(name) || !existsSync(join(directory, 'media', name))) throw new Error('Missing gallery image');
        copyFileSync(join(directory, 'media', name), join(output, 'media', name));
      }
    }
  }
} finally { db.close(); }
writeFileSync(join(output, 'content.sql'), statements.join('\n') + '\n', { mode: 0o600 });
// Ensure no credential files slipped into this export's SQL.
if (/Password:|credential_hash|owner-auth/.test(readFileSync(join(output, 'content.sql'), 'utf8'))) throw new Error('Unexpected private content');
console.log('Published content exported to ignored .cloudflare-private/content.sql; existing remote content will not be overwritten.');
