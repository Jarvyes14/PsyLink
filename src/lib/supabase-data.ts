/** Server-only access to Supabase's HTTP Data API. Never import this into client components. */
import { AppError } from './errors';

export function hasSupabaseDataApi() {
  return Boolean((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) && process.env.SUPABASE_SECRET_KEY);
}

export async function supabaseRows<T>(table: string, query: URLSearchParams): Promise<T[]> {
  const base = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) throw new AppError(500, 'La API de Supabase no está configurada en el servidor.');
  const origin = new URL(base);
  if (origin.protocol !== 'https:' || !origin.hostname.endsWith('.supabase.co')) throw new AppError(500, 'La URL de Supabase no es válida.');
  const response = await fetch(`${origin.origin}/rest/v1/${encodeURIComponent(table)}?${query}`, {
    headers: { apikey: key, Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    // Supabase's response may include sensitive query context; do not relay it to browsers or logs.
    throw new AppError(502, 'No pudimos consultar Supabase. Revisa la configuración de la API y los permisos de la base.');
  }
  return response.json() as Promise<T[]>;
}
