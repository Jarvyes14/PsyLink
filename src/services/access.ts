import { db } from '@/lib/db';
import { assert } from '@/lib/errors';
import type { Actor } from '@/lib/auth';
import type { Prisma } from '@prisma/client';
export async function assertNotBlocked(a: string, b: string) {
  const blocked = await db.block.findFirst({ where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] } });
  assert(!blocked, 403, 'Esta conexión no está disponible.');
}
export async function authorizedMatch(actor: Actor, matchId: string, active = true) {
  const match = await db.match.findUnique({ where: { id: matchId }, include: { patient: { include: { user: { select: { id: true, name: true, active: true } } } }, psychologist: { include: { user: { select: { id: true, name: true, active: true } } } }, conversation: true } });
  assert(match && (match.patient.userId === actor.id || match.psychologist.userId === actor.id), 404, 'Conexión no encontrada.');
  assert(!active || match.active, 403, 'Esta conexión ya no está activa.');
  assert(!active || (match.patient.user.active && match.psychologist.user.active), 403, 'Esta cuenta no está disponible.');
  if (active) await assertNotBlocked(match.patient.userId, match.psychologist.userId);
  return match;
}
export function professionalInclude() {
  return {
    user: { select: { id: true, name: true } },
    specialties: { include: { specialty: true } },
    approaches: { include: { approach: true } },
    availability: {
      where: { startsAt: { gt: new Date() }, appointments: { none: { status: { in: ['REQUESTED', 'CONFIRMED'] } } } },
      orderBy: { startsAt: 'asc' as const },
    },
  } satisfies Prisma.PsychologistProfileInclude;
}
