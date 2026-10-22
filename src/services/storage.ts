import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { del, get, put } from '@vercel/blob';
import { assert } from '@/lib/errors';
import { adminDb } from '@/lib/supabase-admin';
export interface PrivateStorage { put(bytes: Buffer): Promise<string>; get(key: string): Promise<Buffer>; remove(key: string): Promise<void> }
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
const root = () => path.resolve(/* turbopackIgnore: true */ process.env.STORAGE_DIR || '.local/storage');
const encryptionKey = () => { const key = Buffer.from(process.env.STORAGE_KEY || '', 'hex'); assert(key.length === 32, 500, 'El almacenamiento no está configurado.'); return key; };
const storageDriver = () => {
  const driver = process.env.STORAGE_DRIVER || (process.env.SUPABASE_SECRET_KEY ? 'supabase' : process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL === '1' ? 'vercel-blob' : 'local');
  assert(driver === 'local' || driver === 'vercel-blob' || driver === 'supabase', 500, 'El proveedor de almacenamiento no es válido.');
  assert(driver !== 'local' || process.env.VERCEL !== '1', 500, 'El almacenamiento persistente no está configurado.');
  return driver;
};
const assertBlobCredentials = () => assert(process.env.BLOB_READ_WRITE_TOKEN || (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID), 500, 'Vercel Blob no está configurado.');
const localKey = (key: string) => { assert(/^[a-f0-9]{48}$/.test(key), 404, 'Archivo no encontrado.'); return key; };
const blobKey = (key: string) => { assert(/^psylink\/[a-f0-9]{48}$/.test(key), 404, 'Archivo no encontrado.'); return key; };
const bucket = 'psicomatch-private';
let bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;
  const storage = adminDb().storage;
  const existing = await storage.getBucket(bucket);
  if (existing.error) {
    const created = await storage.createBucket(bucket, { public: false, allowedMimeTypes: ['application/octet-stream'], fileSizeLimit: MAX_FILE_BYTES + 28 });
    if (created.error) {
      const retry = await storage.getBucket(bucket);
      assert(!retry.error && retry.data && !retry.data.public, 502, 'No pudimos preparar el almacenamiento privado.');
    }
  } else assert(existing.data && !existing.data.public, 500, 'El almacenamiento debe ser privado.');
  bucketReady = true;
}
const encrypt = (bytes: Buffer) => { const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv); const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]); return Buffer.concat([iv, cipher.getAuthTag(), encrypted]); };
const decrypt = (data: Buffer) => { assert(data.length >= 28, 404, 'Archivo no encontrado.'); const cipher = createDecipheriv('aes-256-gcm', encryptionKey(), data.subarray(0, 12)); cipher.setAuthTag(data.subarray(12, 28)); return Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]); };
export const storage: PrivateStorage = {
  async put(bytes) {
    const key = randomBytes(24).toString('hex');
    const encrypted = encrypt(bytes);
    if (storageDriver() === 'supabase') {
      await ensureBucket();
      const objectKey = `psylink/${key}`;
      const uploaded = await adminDb().storage.from(bucket).upload(objectKey, encrypted, { contentType: 'application/octet-stream', upsert: false });
      assert(!uploaded.error, 502, 'No pudimos guardar el archivo privado.');
      return objectKey;
    }
    if (storageDriver() === 'vercel-blob') {
      assertBlobCredentials();
      const blob = await put(`psylink/${key}`, encrypted, { access: 'private', contentType: 'application/octet-stream' });
      return blob.pathname;
    }
    await mkdir(root(), { recursive: true });
    await writeFile(path.join(/* turbopackIgnore: true */ root(), key), encrypted, { mode: 0o600 });
    return key;
  },
  async get(key) {
    if (storageDriver() === 'supabase') {
      const result = await adminDb().storage.from(bucket).download(blobKey(key));
      assert(!result.error && result.data, 404, 'Archivo no encontrado.');
      return decrypt(Buffer.from(await result.data.arrayBuffer()));
    }
    if (storageDriver() === 'vercel-blob') {
      assertBlobCredentials();
      const result = await get(blobKey(key), { access: 'private' });
      assert(result?.statusCode === 200, 404, 'Archivo no encontrado.');
      return decrypt(Buffer.from(await new Response(result.stream).arrayBuffer()));
    }
    const data = await readFile(path.join(/* turbopackIgnore: true */ root(), localKey(key)));
    return decrypt(data);
  },
  async remove(key) {
    if (storageDriver() === 'supabase') { const result = await adminDb().storage.from(bucket).remove([blobKey(key)]); assert(!result.error, 502, 'No pudimos eliminar el archivo privado.'); return; }
    if (storageDriver() === 'vercel-blob') { assertBlobCredentials(); await del(blobKey(key)); return; }
    await unlink(path.join(/* turbopackIgnore: true */ root(), localKey(key))).catch((e: NodeJS.ErrnoException) => { if (e.code !== 'ENOENT') throw e; });
  },
};
export function inspectFile(bytes: Buffer, kind: string) {
  assert(bytes.length > 0 && bytes.length <= MAX_FILE_BYTES, 400, 'El archivo debe pesar entre 1 byte y 4 MB.');
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (kind === 'document' && bytes.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
  assert(false, 400, 'Usa un archivo PNG, JPG o PDF válido (PDF sólo para documentos).');
}
