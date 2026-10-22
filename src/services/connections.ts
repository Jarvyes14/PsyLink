import { db } from '@/lib/db';
import { assert } from '@/lib/errors';
import type { Actor } from '@/lib/auth';
import { assertNotBlocked, authorizedMatch } from './access';
export async function patientAction(actor: Actor, psychologistId: string, action: 'interest' | 'favorite' | 'unfavorite' | 'pass') {
  assert(actor.patient, 403, 'Esta función es para pacientes.');
  const p = await db.psychologistProfile.findUnique({ where: { id: psychologistId }, include: { user: { select: { active: true, onboardingComplete: true, isDemo: true } } } });
  assert(p && p.user.active && p.user.onboardingComplete && p.user.isDemo === actor.isDemo && p.acceptingPatients, 404, 'Perfil no disponible.');
  await assertNotBlocked(actor.id, p.userId);
  const pair = { patientId: actor.patient.id, psychologistId };
  if (action === 'interest') {
    const old = await db.interest.findUnique({ where: { patientId_psychologistId: pair } });
    assert(old?.status !== 'DECLINED', 409, 'El profesional declinó esta solicitud. Puedes descubrir otros perfiles.');
    return db.interest.upsert({ where: { patientId_psychologistId: pair }, create: pair, update: {} });
  }
  if (action === 'favorite') return db.favorite.upsert({ where: { patientId_psychologistId: pair }, create: pair, update: {} });
  if (action === 'unfavorite') return db.favorite.deleteMany({ where: pair });
  return db.passedProfile.upsert({ where: { patientId_psychologistId: pair }, create: pair, update: {} });
}
export async function respondInterest(actor: Actor, id: string, accept: boolean) {
  assert(actor.psychologist, 403, 'Esta función es para profesionales.');
  const interest = await db.interest.findUnique({ where: { id }, include: { patient: { include: { user: { select: { active: true, isDemo: true } } } } } });
  assert(interest && interest.psychologistId === actor.psychologist.id, 404, 'Solicitud no encontrada.');
  assert(interest.patient.user.active, 409, 'La cuenta ya no está activa.');
  assert(interest.patient.user.isDemo === actor.isDemo, 403, 'Esta solicitud no está disponible.');
  await assertNotBlocked(actor.id, interest.patient.userId);
  return db.$transaction(async tx => {
    const updated = await tx.interest.updateMany({ where: { id, status: 'PENDING' }, data: { status: accept ? 'ACCEPTED' : 'DECLINED' } });
    assert(updated.count === 1, 409, 'Esta solicitud ya fue atendida.');
    if (!accept) return { ok: true };
    return tx.match.upsert({ where: { patientId_psychologistId: { patientId: interest.patientId, psychologistId: interest.psychologistId } }, create: { patientId: interest.patientId, psychologistId: interest.psychologistId, conversation: { create: {} } }, update: { active: true } });
  });
}
export async function cancelMatch(actor: Actor, id: string) {
  await authorizedMatch(actor, id, false);
  await db.$transaction([db.match.update({ where: { id }, data: { active: false } }), db.appointment.updateMany({ where: { matchId: id, startsAt: { gt: new Date() }, status: { in: ['REQUESTED', 'CONFIRMED'] } }, data: { status: 'CANCELLED' } })]);
  return { ok: true };
}
export async function conversationAccess(actor: Actor, id: string) {
  const c = await db.conversation.findUnique({ where: { id } });
  assert(c, 404, 'Conversación no encontrada.');
  await authorizedMatch(actor, c.matchId);
  return c;
}
