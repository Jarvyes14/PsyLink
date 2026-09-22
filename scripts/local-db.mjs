import 'dotenv/config';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve('.local/postgres');
const bin = process.env.POSTGRES_BIN || (process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/17/bin' : '/usr/lib/postgresql/17/bin');
const ext = process.platform === 'win32' ? '.exe' : '';
const run = (name, args, env = process.env) => { const r = spawnSync(join(bin, name + ext), args, { stdio: 'inherit', env, windowsHide: true }); if (r.status !== 0) throw new Error(`${name} failed`); };
const url = new URL(process.env.DATABASE_URL);
mkdirSync(root, { recursive: true });
if (!existsSync(join(root, 'data/PG_VERSION'))) {
  const pw = join(root, 'init-password');
  writeFileSync(pw, decodeURIComponent(url.password), { mode: 0o600 });
  try { run('initdb', ['-D', join(root, 'data'), '-U', url.username, '--encoding=UTF8', '--locale=C', '--auth=scram-sha-256', `--pwfile=${pw}`]); } finally { unlinkSync(pw); }
}
const status = spawnSync(join(bin, 'pg_ctl' + ext), ['-D', join(root, 'data'), 'status'], { windowsHide: true });
if (status.status !== 0) run('pg_ctl', ['-D', join(root, 'data'), '-l', join(root, 'server.log'), '-o', `-p ${url.port} -h 127.0.0.1`, '-w', 'start']);
const env = { ...process.env, PGPASSWORD: decodeURIComponent(url.password) };
const check = spawnSync(join(bin, 'psql' + ext), ['-h', '127.0.0.1', '-p', url.port, '-U', url.username, '-d', 'postgres', '-tAc', "SELECT 1 FROM pg_database WHERE datname='psylink'"], { env, encoding: 'utf8', windowsHide: true });
if (check.status !== 0) throw new Error('PostgreSQL health check failed');
if (check.stdout.trim() !== '1') run('createdb', ['-h', '127.0.0.1', '-p', url.port, '-U', url.username, 'psylink'], env);
console.log('Private local PostgreSQL ready on 127.0.0.1:' + url.port);
