import type { Actor } from '@/lib/auth';
import type { Professional } from '@/lib/types';
import { adminDb, dataOrThrow, newId, timestamp } from '@/lib/supabase-admin';
import { assert } from '@/lib/errors';
import { patientSchema, professionalSchema, filterSchema } from '@/lib/validation';
import { compatibility, matchesFilters } from '@/domain/matching';

type ProfileRow = Omit<Professional, 'compatibility' | 'availability' | 'user'> & {
  user: Professional['user'] & { active: boolean; onboardingComplete: boolean };
  availability: (Professional['availability'][number] & { appointments: { status: string }[] })[];
};
const select = '*,user:User!PsychologistProfile_userId_fkey(id,name,isDemo,active,onboardingComplete),specialties:PsychologistSpecialty(*,specialty:Specialty(*)),approaches:PsychologistApproach(*,approach:TherapeuticApproach(*)),availability:Availability(*,appointments:Appointment(id,status))';

async function profiles(id?: string): Promise<ProfileRow[]> {
  const db = adminDb();
  const rows: ProfileRow[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = db.from('PsychologistProfile').select(select).order('id').range(offset, offset + 499);
    if (id) query = query.eq('id', id);
    const page = dataOrThrow(await query) as unknown as ProfileRow[];
    rows.push(...page.map(p => ({ ...p, languages: p.languages || [], specialties: p.specialties || [], approaches: p.approaches || [], availability: p.availability || [] })));
    if (page.length < 500 || id) break;
  }
  const now = Date.now();
  return rows.map(p => ({ ...p, availability: p.availability.filter(slot => new Date(slot.startsAt).getTime() > now && !slot.appointments.some(a => a.status === 'REQUESTED' || a.status === 'CONFIRMED')).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()) }));
}

async function excludedProfiles(actor: Actor) {
  const db = adminDb();
  const blocks = dataOrThrow<{ blockerId: string; blockedId: string }[]>(await db.from('Block').select('blockerId,blockedId').or(`blockerId.eq.${actor.id},blockedId.eq.${actor.id}`));
  const excludedUsers = new Set(blocks.flatMap(item => [item.blockerId, item.blockedId]));
  const passes = actor.patient ? dataOrThrow<{ psychologistId: string }[]>(await db.from('PassedProfile').select('psychologistId').eq('patientId', actor.patient.id)) : [];
  return { excludedUsers, passed: new Set(passes.map(item => item.psychologistId)) };
}

export async function restDiscover(actor: Actor | null, query: URLSearchParams) {
  if (actor) assert(actor.patient, 403, 'Esta función es para pacientes.');
  const filters = filterSchema.parse(Object.fromEntries(query));
  const excluded = actor ? await excludedProfiles(actor) : null;
  const pref = actor?.patient?.preferences;
  return (await profiles()).filter(p => p.acceptingPatients && p.user.active && p.user.onboardingComplete && (!actor || p.user.isDemo === actor.isDemo) && !excluded?.excludedUsers.has(p.userId) && !excluded?.passed.has(p.id) && matchesFilters(p, filters, pref)).map(p => ({ ...p, compatibility: pref ? compatibility(p, pref) : null })).sort((a, b) => (b.compatibility?.score ?? 0) - (a.compatibility?.score ?? 0));
}

export async function restProfessional(actor: Actor | null, id: string) {
  const p = (await profiles(id))[0];
  assert(p, 404, 'Perfil no encontrado.');
  assert((p.user.active && p.user.onboardingComplete && (!actor || p.user.isDemo === actor.isDemo)) || p.userId === actor?.id || actor?.role === 'ADMIN', 404, 'Perfil no disponible.');
  if (actor) {
    const blocked = dataOrThrow<{ id: string }[]>(await adminDb().from('Block').select('id').or(`and(blockerId.eq.${actor.id},blockedId.eq.${p.userId}),and(blockerId.eq.${p.userId},blockedId.eq.${actor.id})`).limit(1));
    assert(!blocked.length, 403, 'Esta conexión no está disponible.');
  }
  return { ...p, compatibility: actor?.patient?.preferences ? compatibility(p, actor.patient.preferences) : null };
}

export async function restSavePatient(actor: Actor, input: unknown) {
  assert(actor.patient, 403, 'Esta función es para pacientes.');
  const data = patientSchema.parse(input);
  const now = timestamp();
  if (actor.patient.preferences) dataOrThrow(await adminDb().from('PatientPreference').update({ ...data, updatedAt: now }).eq('id', actor.patient.preferences.id).eq('patientId', actor.patient.id).select('id'));
  else dataOrThrow(await adminDb().from('PatientPreference').insert({ id: newId(), patientId: actor.patient.id, ...data, createdAt: now, updatedAt: now }).select('id'));
  dataOrThrow(await adminDb().from('User').update({ onboardingComplete: true, updatedAt: now }).eq('id', actor.id).select('id'));
  return { ok: true };
}

export async function restSaveProfessional(actor: Actor, input: unknown) {
  assert(actor.psychologist, 403, 'Esta función es para profesionales.');
  const { name, specialties, approaches, photoId, ...data } = professionalSchema.parse(input);
  const db = adminDb();
  if (photoId) {
    const file = dataOrThrow(await db.from('StoredFile').select('id').eq('id', photoId).eq('ownerId', actor.id).eq('kind', 'photo').maybeSingle());
    assert(file, 400, 'La fotografía no pertenece a tu cuenta.');
  }
  const previous = dataOrThrow<{ license: string; education: string; university: string }>(await db.from('PsychologistProfile').select('license,education,university').eq('id', actor.psychologist.id).single());
  const changed = previous.license !== data.license || previous.education !== data.education || previous.university !== data.university || actor.name !== name;
  const now = timestamp();
  dataOrThrow(await db.from('PsychologistProfile').update({ ...data, ...(photoId !== undefined ? { photoId } : {}), ...(changed ? { verificationStatus: 'UNVERIFIED' as const } : {}), updatedAt: now }).eq('id', actor.psychologist.id).select('id'));
  dataOrThrow(await db.from('PsychologistSpecialty').delete().eq('psychologistId', actor.psychologist.id).select('specialtyId'));
  if (specialties.length) dataOrThrow(await db.from('PsychologistSpecialty').insert(specialties.map(specialtyId => ({ psychologistId: actor.psychologist!.id, specialtyId, createdAt: now, updatedAt: now }))).select('specialtyId'));
  dataOrThrow(await db.from('PsychologistApproach').delete().eq('psychologistId', actor.psychologist.id).select('approachId'));
  if (approaches.length) dataOrThrow(await db.from('PsychologistApproach').insert(approaches.map(approachId => ({ psychologistId: actor.psychologist!.id, approachId, createdAt: now, updatedAt: now }))).select('approachId'));
  if (changed) dataOrThrow(await db.from('ProfessionalVerification').update({ status: 'REJECTED', reviewNote: 'El perfil cambió. Envía una nueva solicitud.', updatedAt: now }).eq('psychologistId', actor.psychologist.id).eq('status', 'PENDING').select('id'));
  dataOrThrow(await db.from('User').update({ name, onboardingComplete: true, updatedAt: now }).eq('id', actor.id).select('id'));
  return { ok: true };
}
