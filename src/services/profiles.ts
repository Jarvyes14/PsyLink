import { db } from '@/lib/db';
import { assert } from '@/lib/errors';
import { type Actor } from '@/lib/auth';
import { patientSchema, professionalSchema, filterSchema } from '@/lib/validation';
import { compatibility, matchesFilters } from '@/domain/matching';
import { assertNotBlocked, professionalInclude } from './access';
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
export async function discover(actor: Actor, query: URLSearchParams) {
  assert(actor.patient, 403, 'Esta función es para pacientes.');
  const filters = filterSchema.parse(Object.fromEntries(query));
  const blocked = await db.block.findMany({ where: { OR: [{ blockerId: actor.id }, { blockedId: actor.id }] } });
  const profiles = await db.psychologistProfile.findMany({ where: { user: { active: true, onboardingComplete: true, isDemo: actor.isDemo, id: { notIn: blocked.flatMap(b => [b.blockerId, b.blockedId]) } }, acceptingPatients: true, passes: { none: { patientId: actor.patient.id } } }, include: professionalInclude() });
  const preferences = actor.patient.preferences;
  return profiles.filter(p => matchesFilters(p, filters, preferences)).map(p => ({ ...p, compatibility: preferences ? compatibility(p, preferences) : null })).sort((a, b) => (b.compatibility?.score ?? 0) - (a.compatibility?.score ?? 0));
}
export async function getProfessional(actor: Actor, id: string) {
  const p = await db.psychologistProfile.findUnique({ where: { id }, include: professionalInclude() });
  assert(p, 404, 'Perfil no encontrado.');
  const owner = await db.user.findUniqueOrThrow({ where: { id: p.userId }, select: { active: true, onboardingComplete: true } });
  assert((owner.active && owner.onboardingComplete && p.user.isDemo === actor.isDemo) || p.userId === actor.id || actor.role === 'ADMIN', 404, 'Perfil no disponible.');
  await assertNotBlocked(actor.id, p.userId);
  return { ...p, compatibility: actor.patient?.preferences ? compatibility(p, actor.patient.preferences) : null };
}
