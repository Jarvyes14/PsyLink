import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppError } from './errors';
import type { Database } from './supabase/database.types';

let client: SupabaseClient<Database> | undefined;
export function adminDb() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new AppError(500, 'Configura SUPABASE_SECRET_KEY sólo en el servidor.');
  if (!client) client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export function dataOrThrow<T>(result: { data: T | null; error: { code?: string; message: string } | null }): T {
  if (!result.error) return result.data as T;
  if (result.error.code === '23505') throw new AppError(409, 'Este registro ya existe.');
  if (result.error.code === '23503') throw new AppError(409, 'La operación hace referencia a un registro no disponible.');
  if (result.error.code === '23P01') throw new AppError(409, 'El horario ya no está disponible.');
  // Do not return provider details or SQL to users.
  throw new AppError(502, 'No pudimos completar la operación en la base de datos.');
}

export const newId = () => crypto.randomUUID();
export const timestamp = () => new Date().toISOString();
