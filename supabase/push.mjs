// Applies the migrations and loads the 649 students into Supabase.
// Usage: put DATABASE_URL in .env.local (never commit it), then `npm run db:push`.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const envFile of [join(root, '.env.local'), join(root, '.env.supabase')]) {
  if (!existsSync(envFile)) continue;
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is missing. Copy .env.example to .env.local and fill it in.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
const dir = join(root, 'supabase', 'migrations');
for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
  await client.query(readFileSync(join(dir, f), 'utf8'));
  console.log('applied', f);
}

const text = readFileSync(join(root, 'data', 'student-por.csv'), 'utf8').trim().split(/\r?\n/);
const header = text[0].split(';').map((h) => h.replace(/"/g, ''));
const rows = text.slice(1).map((l) => l.split(';').map((v) => v.replace(/"/g, '')));
await client.query('begin');
await client.query('delete from public.students');
for (let i = 0; i < rows.length; i++) {
  const cols = ['id', ...header].map((c) => `"${c}"`).join(',');
  const params = [i + 1, ...rows[i].map((v) => (/^\d+$/.test(v) ? Number(v) : v))];
  await client.query(`insert into public.students (${cols}) values (${params.map((_, k) => `$${k + 1}`).join(',')})`, params);
}
await client.query('commit');
const { rows: s } = await client.query('select * from public.students_summary');
console.log('loaded', s[0]);
await client.end();
