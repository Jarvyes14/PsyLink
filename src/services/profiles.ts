import { db } from '@/lib/db';
import { assert } from '@/lib/errors';
import { type Actor } from '@/lib/auth';
import { patientSchema, professionalSchema, filterSchema } from '@/lib/validation';
import { compatibility, matchesFilters } from '@/domain/matching';
import { assertNotBlocked, professionalInclude } from './access';
import { hasSupabaseDataApi, supabaseRows } from '@/lib/supabase-data';
import type { Prisma } from '@prisma/client';

type PublicProfile = Prisma.PsychologistProfileGetPayload<{ include: ReturnType<typeof professionalInclude> }>;
type ApiProfile = Omit<PublicProfile, 'user' | 'availability'> & { user: PublicProfile['user'] & { active: boolean; onboardingComplete: boolean }; availability: (PublicProfile['availability'][number] & { appointments: { status: string }[] })[] };
const publicSelect = '*,user:User!PsychologistProfile_userId_fkey(id,name,isDemo,active,onboardingComplete),specialties:PsychologistSpecialty(specialtyId,specialty:Specialty(name)),approaches:PsychologistApproach(approachId,approach:TherapeuticApproach(name,description)),availability:Availability(id,psychologistId,startsAt,endsAt,appointments:Appointment(status))';
async function apiProfiles(id?: string): Promise<PublicProfile[]> {
  const query = new URLSearchParams({ select: publicSelect, limit: '1000' });
  if (id) query.set('id', `eq.${id}`);
  const rows = await supabaseRows<ApiProfile>('PsychologistProfile', query);
  const now = Date.now();
  return rows.filter(p => p.user.active && p.user.onboardingComplete).map(p => ({ ...p, availability: p.availability.filter(a => new Date(a.startsAt).getTime() > now && !a.appointments.some(item => item.status === 'REQUESTED' || item.status === 'CONFIRMED')).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()) }));
}
export async function savePatient(actor: Actor, input: unknown) {
  assert(actor.patient, 403, 'Esta función es para pacientes.');
  const data = patientSchema.parse(input);
  await db.$transaction([db.patientPreference.upsert({ where: { patientId: actor.patient.id }, create: { ...data, patientId: actor.patient.id }, update: data }), db.user.update({ where: { id: actor.id }, data: { onboardingComplete: true } })]);
  return { ok: true };
}
export async function saveProfessional(actor: Actor, input: unknown) {
  assert(actor.psychologist, 403, 'Esta función es para profesionales.');
  const { name, specialties, approaches, photoId, ...data } = professionalSchema.parse(input);
  if (photoId) assert(await db.storedFile.findFirst({ where: { id: photoId, ownerId: actor.id, kind: 'photo' } }), 400, 'La fotografía no pertenece a tu cuenta.');
  const previous = await db.psychologistProfile.findUniqueOrThrow({ where: { id: actor.psychologist.id }, include: { user: { select: { name: true } } } });
  const changedCredentials = previous.license !== data.license || previous.user.name !== name || previous.education !== data.education || previous.university !== data.university;
  await db.$transaction(async tx => {
    await tx.psychologistSpecialty.deleteMany({ where: { psychologistId: previous.id } });
    await tx.psychologistApproach.deleteMany({ where: { psychologistId: previous.id } });
    await tx.psychologistProfile.update({ where: { id: previous.id }, data: { ...data, ...(photoId !== undefined ? { photoId } : {}), ...(changedCredentials ? { verificationStatus: 'UNVERIFIED' } : {}), specialties: { create: specialties.map(specialtyId => ({ specialtyId })) }, approaches: { create: approaches.map(approachId => ({ approachId })) } } });
    if (changedCredentials) await tx.professionalVerification.updateMany({ where: { psychologistId: previous.id, status: 'PENDING' }, data: { status: 'REJECTED', reviewNote: 'El perfil cambió. Envía una nueva solicitud.' } });
    await tx.user.update({ where: { id: actor.id }, data: { name, onboardingComplete: true } });
  });
  return { ok: true };
}
export async function discover(actor: Actor | null, query: URLSearchParams) {
  if (actor) assert(actor.patient, 403, 'Esta función es para pacientes.');
  const filters = filterSchema.parse(Object.fromEntries(query));
  const blocked = actor ? await db.block.findMany({ where: { OR: [{ blockerId: actor.id }, { blockedId: actor.id }] } }) : [];
  const profiles = !actor && hasSupabaseDataApi()
    ? (await apiProfiles()).filter(p => p.acceptingPatients)
    : await db.psychologistProfile.findMany({ where: { user: { active: true, onboardingComplete: true, ...(actor ? { isDemo: actor.isDemo, id: { notIn: blocked.flatMap(b => [b.blockerId, b.blockedId]) } } : {}) }, acceptingPatients: true, ...(actor?.patient ? { passes: { none: { patientId: actor.patient.id } } } : {}) }, include: professionalInclude() });
  const preferences = actor?.patient?.preferences;
  return profiles.filter(p => matchesFilters(p, filters, preferences)).map(p => ({ ...p, compatibility: preferences ? compatibility(p, preferences) : null })).sort((a, b) => (b.compatibility?.score ?? 0) - (a.compatibility?.score ?? 0));
}
export async function getProfessional(actor: Actor | null, id: string) {
  const p = !actor && hasSupabaseDataApi() ? (await apiProfiles(id))[0] : await db.psychologistProfile.findUnique({ where: { id }, include: professionalInclude() });
  assert(p, 404, 'Perfil no encontrado.');
  const owner = !actor && hasSupabaseDataApi() ? { active: true, onboardingComplete: true } : await db.user.findUniqueOrThrow({ where: { id: p.userId }, select: { active: true, onboardingComplete: true } });
  assert((owner.active && owner.onboardingComplete && (!actor || p.user.isDemo === actor.isDemo)) || p.userId === actor?.id || actor?.role === 'ADMIN', 404, 'Perfil no disponible.');
  if (actor) await assertNotBlocked(actor.id, p.userId);
  return { ...p, compatibility: actor?.patient?.preferences ? compatibility(p, actor.patient.preferences) : null };
}
