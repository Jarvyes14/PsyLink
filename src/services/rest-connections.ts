import type { Actor } from '@/lib/auth';
import { assert } from '@/lib/errors';
import { adminDb, dataOrThrow, newId, timestamp } from '@/lib/supabase-admin';

type LinkedUser = { id: string; name: string; active: boolean; isDemo: boolean };
type MatchRow = { id: string; patientId: string; psychologistId: string; active: boolean; patient: { userId: string; user: LinkedUser }; psychologist: { userId: string; user: LinkedUser }; conversation: { id: string; matchId: string } | null };

export async function restNotBlocked(a: string, b: string) {
  const rows = dataOrThrow<{ id: string }[]>(await adminDb().from('Block').select('id').or(`and(blockerId.eq.${a},blockedId.eq.${b}),and(blockerId.eq.${b},blockedId.eq.${a})`).limit(1));
  assert(!rows.length, 403, 'Esta conexión no está disponible.');
}

export async function restMatch(actor: Actor, id: string, active = true) {
  const match = dataOrThrow<MatchRow>(await adminDb().from('Match').select('*,patient:PatientProfile(userId,user:User(id,name,active,isDemo)),psychologist:PsychologistProfile(userId,user:User(id,name,active,isDemo)),conversation:Conversation(id,matchId)').eq('id', id).maybeSingle());
  assert(match && (match.patient.userId === actor.id || match.psychologist.userId === actor.id), 404, 'Conexión no encontrada.');
  assert(!active || match.active, 403, 'Esta conexión ya no está activa.');
  assert(!active || (match.patient.user.active && match.psychologist.user.active), 403, 'Esta cuenta no está disponible.');
  assert(!active || (match.patient.user.isDemo === actor.isDemo && match.psychologist.user.isDemo === actor.isDemo), 403, 'Esta conexión no está disponible.');
  if (active) await restNotBlocked(match.patient.userId, match.psychologist.userId);
  return match;
}

export async function restPatientAction(actor: Actor, psychologistId: string, action: 'interest' | 'favorite' | 'unfavorite' | 'pass') {
  assert(actor.patient, 403, 'Esta función es para pacientes.');
  const db = adminDb();
  const profile = dataOrThrow<{ id: string; userId: string; acceptingPatients: boolean; user: { active: boolean; onboardingComplete: boolean; isDemo: boolean } }>(await db.from('PsychologistProfile').select('id,userId,acceptingPatients,user:User(active,onboardingComplete,isDemo)').eq('id', psychologistId).maybeSingle());
  assert(profile && profile.user.active && profile.user.onboardingComplete && profile.user.isDemo === actor.isDemo && profile.acceptingPatients, 404, 'Perfil no disponible.');
  await restNotBlocked(actor.id, profile.userId);
  const pair = { patientId: actor.patient.id, psychologistId };
  if (action === 'interest') {
    const old = dataOrThrow<{ id: string; status: string }>(await db.from('Interest').select('id,status').eq('patientId', pair.patientId).eq('psychologistId', pair.psychologistId).maybeSingle());
    assert(old?.status !== 'DECLINED', 409, 'El profesional declinó esta solicitud. Puedes descubrir otros perfiles.');
    if (old) return old;
    return dataOrThrow(await db.from('Interest').insert({ id: newId(), ...pair, createdAt: timestamp(), updatedAt: timestamp() }).select('*').single());
  }
  if (action === 'favorite') return dataOrThrow(await db.from('Favorite').upsert({ id: newId(), ...pair, createdAt: timestamp(), updatedAt: timestamp() }, { onConflict: 'patientId,psychologistId', ignoreDuplicates: true }).select('*').maybeSingle());
  if (action === 'unfavorite') { await db.from('Favorite').delete().eq('patientId', pair.patientId).eq('psychologistId', pair.psychologistId); return { count: 1 }; }
  return dataOrThrow(await db.from('PassedProfile').upsert({ ...pair, createdAt: timestamp(), updatedAt: timestamp() }, { onConflict: 'patientId,psychologistId', ignoreDuplicates: true }).select('*').maybeSingle());
}

export async function restRespondInterest(actor: Actor, id: string, accept: boolean) {
  assert(actor.psychologist, 403, 'Esta función es para profesionales.');
  const db = adminDb();
  const interest = dataOrThrow<{ id: string; patientId: string; psychologistId: string; patient: { userId: string; user: { active: boolean; isDemo: boolean } } }>(await db.from('Interest').select('*,patient:PatientProfile(userId,user:User(active,isDemo))').eq('id', id).maybeSingle());
  assert(interest && interest.psychologistId === actor.psychologist.id, 404, 'Solicitud no encontrada.');
  assert(interest.patient.user.active, 409, 'La cuenta ya no está activa.');
  assert(interest.patient.user.isDemo === actor.isDemo, 403, 'Esta solicitud no está disponible.');
  await restNotBlocked(actor.id, interest.patient.userId);
  return dataOrThrow(await db.rpc('respond_interest', { p_interest_id: id, p_psychologist_id: actor.psychologist.id, p_accept: accept }));
}

export async function restCancelMatch(actor: Actor, id: string) {
  await restMatch(actor, id, false);
  const db = adminDb();
  dataOrThrow(await db.from('Match').update({ active: false, updatedAt: timestamp() }).eq('id', id).select('id'));
  dataOrThrow(await db.from('Appointment').update({ status: 'CANCELLED', updatedAt: timestamp() }).eq('matchId', id).gt('startsAt', timestamp()).in('status', ['REQUESTED', 'CONFIRMED']).select('id'));
  return { ok: true };
}

export async function restConversationAccess(actor: Actor, id: string) {
  const conversation = dataOrThrow<{ id: string; matchId: string }>(await adminDb().from('Conversation').select('id,matchId').eq('id', id).maybeSingle());
  assert(conversation, 404, 'Conversación no encontrada.');
  await restMatch(actor, conversation.matchId);
  return conversation;
}
