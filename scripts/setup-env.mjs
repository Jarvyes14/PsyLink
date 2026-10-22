import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (existsSync('.env')) { console.log('.env already exists; preserved.'); process.exit(0); }
mkdirSync('.local', { recursive: true });
const db = randomBytes(24).toString('hex');
const demo = `Psy-${randomBytes(12).toString('base64url')}!`;
writeFileSync('.env', `DATABASE_URL=postgresql://psylink:${db}@127.0.0.1:5433/psylink?schema=public\nAPP_URL=http://127.0.0.1:3000\nSTORAGE_KEY=${randomBytes(32).toString('hex')}\nSTORAGE_DRIVER=local\nSTORAGE_DIR=.local/storage\nDEMO_PASSWORD=${demo}\nMAIL_TRANSPORT=local\n`, { mode: 0o600 });
writeFileSync('.local/demo-credentials.txt', `patient@psylink.demo\npsychologist@psylink.demo\nadmin@psylink.demo\nPassword: ${demo}\n`, { mode: 0o600 });
console.log('Environment and local demo credentials generated.');
