import 'server-only';
import type { User as SupabaseIdentity } from '@supabase/supabase-js';
import { adminDb, dataOrThrow, newId, timestamp } from './supabase-admin';
import { defaultStyles } from '@/domain/catalog';
import type { Actor } from './auth';
import type { Database } from './supabase/database.types';

export async function actorFromIdentity(identity: SupabaseIdentity) {
  if (!identity.email || !identity.email_confirmed_at) return null;
  const db = adminDb();
  const email = identity.email.toLowerCase();
  type UserLink = { id: string; authId: string | null };
  let row = dataOrThrow<UserLink>(await db.from('User').select('id,authId').eq('authId', identity.id).maybeSingle());
  if (!row) {
    const old = dataOrThrow<UserLink>(await db.from('User').select('id,authId').eq('email', email).maybeSingle());
    if (old) {
      if (old.authId && old.authId !== identity.id) return null;
      const linked = dataOrThrow(await db.from('User').update({ authId: identity.id, updatedAt: timestamp() }).eq('id', old.id).is('authId', null).select('id'));
      if (linked.length !== 1) return null;
      row = { id: old.id, authId: identity.id };
    } else {
      const role = identity.user_metadata?.role === 'PSYCHOLOGIST' ? 'PSYCHOLOGIST' : 'PATIENT';
      const name = String(identity.user_metadata?.name || email.split('@')[0]).trim().slice(0, 100);
      const id = newId();
      const now = timestamp();
      dataOrThrow(await db.from('User').insert({ id, authId: identity.id, email, name, role, passwordHash: 'supabase-auth', consentAt: now, createdAt: now, updatedAt: now }).select('id'));
      row = { id, authId: identity.id };
    }
  }
  const account = dataOrThrow<{ id: string; email: string; name: string; role: 'PATIENT' | 'PSYCHOLOGIST' | 'ADMIN'; isDemo: boolean; active: boolean; onboardingComplete: boolean; createdAt: string }>(await db.from('User').select('id,email,name,role,isDemo,active,onboardingComplete,createdAt').eq('id', row.id).single());
  const now = timestamp();
  if (!account.active) return null;
  let patient = account.role === 'PATIENT' ? dataOrThrow<{ id: string }>(await db.from('PatientProfile').select('id').eq('userId', row.id).maybeSingle()) : null;
  let psychologist = account.role === 'PSYCHOLOGIST' ? dataOrThrow<{ id: string; verificationStatus: string }>(await db.from('PsychologistProfile').select('id,verificationStatus').eq('userId', row.id).maybeSingle()) : null;
  if (account.role === 'PATIENT' && !patient) {
    dataOrThrow(await db.from('PatientProfile').upsert({ id: newId(), userId: row.id, createdAt: now, updatedAt: now }, { onConflict: 'userId', ignoreDuplicates: true }).select('id'));
    patient = dataOrThrow<{ id: string }>(await db.from('PatientProfile').select('id').eq('userId', row.id).single());
  }
  if (account.role === 'PSYCHOLOGIST' && !psychologist) {
    dataOrThrow(await db.from('PsychologistProfile').upsert({ id: newId(), userId: row.id, styles: defaultStyles, languages: ['Español'], createdAt: now, updatedAt: now }, { onConflict: 'userId', ignoreDuplicates: true }).select('id'));
    psychologist = dataOrThrow<{ id: string; verificationStatus: string }>(await db.from('PsychologistProfile').select('id,verificationStatus').eq('userId', row.id).single());
  }
  const preferences = patient ? dataOrThrow<Database['public']['Tables']['PatientPreference']['Row']>(await db.from('PatientPreference').select('*').eq('patientId', patient.id).maybeSingle()) : null;
  if (account.email !== email) dataOrThrow(await db.from('User').update({ email, updatedAt: now }).eq('id', row.id).select('id'));
  // Prisma's legacy Actor type uses Date; PostgREST serializes timestamps as ISO strings.
  return { ...account, email, patient: patient ? { ...patient, preferences } : null, psychologist } as unknown as Actor;
}
