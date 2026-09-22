import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { assert } from '@/lib/errors';
export interface PrivateStorage { put(bytes: Buffer): Promise<string>; get(key: string): Promise<Buffer>; remove(key: string): Promise<void> }
const root = () => path.resolve(/* turbopackIgnore: true */ process.env.STORAGE_DIR || '.local/storage');
const encryptionKey = () => { const key = Buffer.from(process.env.STORAGE_KEY || '', 'hex'); assert(key.length === 32, 500, 'El almacenamiento no está configurado.'); return key; };
export const storage: PrivateStorage = {
  async put(bytes) { await mkdir(root(), { recursive: true }); const key = randomBytes(24).toString('hex'); const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv); const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]); await writeFile(path.join(/* turbopackIgnore: true */ root(), key), Buffer.concat([iv, cipher.getAuthTag(), encrypted]), { mode: 0o600 }); return key; },
  async get(key) { assert(/^[a-f0-9]{48}$/.test(key), 404, 'Archivo no encontrado.'); const data = await readFile(path.join(/* turbopackIgnore: true */ root(), key)); const cipher = createDecipheriv('aes-256-gcm', encryptionKey(), data.subarray(0, 12)); cipher.setAuthTag(data.subarray(12, 28)); return Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]); },
  async remove(key) { assert(/^[a-f0-9]{48}$/.test(key), 404, 'Archivo no encontrado.'); await unlink(path.join(/* turbopackIgnore: true */ root(), key)).catch((e: NodeJS.ErrnoException) => { if (e.code !== 'ENOENT') throw e; }); },
};
export function inspectFile(bytes: Buffer, kind: string) {
  assert(bytes.length > 0 && bytes.length <= 5 * 1024 * 1024, 400, 'El archivo debe pesar entre 1 byte y 5 MB.');
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (kind === 'document' && bytes.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
  assert(false, 400, 'Usa un archivo PNG, JPG o PDF válido (PDF sólo para documentos).');
}
