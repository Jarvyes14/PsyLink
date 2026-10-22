import { db } from '@/lib/db';
import type { Actor } from '@/lib/auth';
import { professionalInclude } from './access';
import { compatibility } from '@/domain/matching';
export async function overview(actor: Actor) {
  const blocked = await db.block.findMany({ where: { OR: [{ blockerId: actor.id }, { blockedId: actor.id }] } });
  const excluded = blocked.map(b => b.blockerId === actor.id ? b.blockedId : b.blockerId);
  const where = actor.patient ? { patientId: actor.patient.id } : actor.psychologist ? { psychologistId: actor.psychologist.id } : { id: '__none__' };
  const [matches, appointments, interests] = await Promise.all([
    db.match.findMany({ where: { ...where, active: true, patient: { user: { active: true, isDemo: actor.isDemo, id: { notIn: excluded } } }, psychologist: { user: { active: true, isDemo: actor.isDemo, id: { notIn: excluded } } } }, include: { patient: { include: { user: { select: { id: true, name: true } } } }, psychologist: { include: professionalInclude() }, conversation: { include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 }, _count: { select: { messages: { where: { readAt: null, senderId: { not: actor.id } } } } } } } }, orderBy: { updatedAt: 'desc' } }),
    db.appointment.findMany({ where, include: { patient: { include: { user: { select: { name: true } } } }, psychologist: { include: { user: { select: { name: true } } } } }, orderBy: { startsAt: 'asc' } }),
    db.interest.findMany({ where: { ...where, patient: { user: { active: true, isDemo: actor.isDemo, id: { notIn: excluded } } }, psychologist: { user: { active: true, isDemo: actor.isDemo, id: { notIn: excluded } } } }, include: { patient: { include: { user: { select: { id: true, name: true } } } }, psychologist: { include: { user: { select: { id: true, name: true } } } } }, orderBy: { createdAt: 'desc' } }),
  ]);
  const favorites = actor.patient ? await db.favorite.findMany({ where: { patientId: actor.patient.id, psychologist: { user: { active: true, isDemo: actor.isDemo, id: { notIn: excluded } } } }, include: { psychologist: { include: professionalInclude() } }, orderBy: { createdAt: 'desc' } }) : [];
  const profile = actor.psychologist ? await db.psychologistProfile.findUnique({ where: { id: actor.psychologist.id }, include: { ...professionalInclude(), availability: { where: { startsAt: { gt: new Date() } }, include: { appointments: { where: { status: { in: ['REQUESTED', 'CONFIRMED'] } }, select: { id: true } } }, orderBy: { startsAt: 'asc' } }, verifications: { orderBy: { createdAt: 'desc' } } } }) : null;
  return { user: actor, matches, appointments, interests, favorites: favorites.map(f => ({ ...f.psychologist, compatibility: actor.patient?.preferences ? compatibility(f.psychologist, actor.patient.preferences) : null })), profile };
}
export async function adminOverview() {
  const [users, verifications, reports, matches, appointments] = await Promise.all([
    db.user.findMany({ select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, psychologist: { select: { id: true, verificationStatus: true } } }, orderBy: { createdAt: 'desc' } }),
    db.professionalVerification.findMany({ include: { psychologist: { include: { user: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' } }),
    db.report.findMany({ include: { reporter: { select: { name: true } }, target: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }),
    db.match.count({ where: { active: true } }), db.appointment.count({ where: { status: 'CONFIRMED' } }),
  ]);
  return { users, verifications, reports, stats: { users: users.length, professionals: users.filter(u => u.role === 'PSYCHOLOGIST').length, matches, appointments } };
}
