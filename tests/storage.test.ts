import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MAX_FILE_BYTES, inspectFile, storage } from '@/services/storage';

const previous = {
  driver: process.env.STORAGE_DRIVER,
  directory: process.env.STORAGE_DIR,
  key: process.env.STORAGE_KEY,
};
let directory: string | undefined;

afterEach(async () => {
  if (directory) await rm(directory, { force: true, recursive: true });
  directory = undefined;
  if (previous.driver === undefined) delete process.env.STORAGE_DRIVER; else process.env.STORAGE_DRIVER = previous.driver;
  if (previous.directory === undefined) delete process.env.STORAGE_DIR; else process.env.STORAGE_DIR = previous.directory;
  if (previous.key === undefined) delete process.env.STORAGE_KEY; else process.env.STORAGE_KEY = previous.key;
});

describe('almacenamiento privado', () => {
  it('cifra, recupera y elimina archivos con el adaptador local', async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'psylink-storage-'));
    process.env.STORAGE_DRIVER = 'local';
    process.env.STORAGE_DIR = directory;
    process.env.STORAGE_KEY = '11'.repeat(32);
    const original = Buffer.from('documento privado de prueba');

    const key = await storage.put(original);
    const encrypted = await readFile(path.join(directory, key));
    expect(encrypted.includes(original)).toBe(false);
    expect(await storage.get(key)).toEqual(original);
    await storage.remove(key);
    await expect(readFile(path.join(directory, key))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('respeta el límite de carga compatible con Vercel Functions', () => {
    expect(MAX_FILE_BYTES).toBe(4 * 1024 * 1024);
    expect(() => inspectFile(Buffer.alloc(MAX_FILE_BYTES + 1), 'photo')).toThrow('4 MB');
  });
});
