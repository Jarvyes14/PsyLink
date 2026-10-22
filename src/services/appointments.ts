import { db } from '@/lib/db';
import { assert, AppError } from '@/lib/errors';
import type { Actor } from '@/lib/auth';
import { authorizedMatch } from './access';
import { Prisma } from '@prisma/client';
export async function bookAppointment(actor: Actor, matchId: string, availabilityId: string) {
  assert(actor.patient, 403, 'Sólo un paciente puede solicitar una sesión.');
  const match = await authorizedMatch(actor, matchId);
  try {
    return await db.$transaction(async tx => {
      const slot = await tx.availability.findUnique({ where: { id: availabilityId } });
      assert(slot && slot.psychologistId === match.psychologistId && slot.startsAt > new Date(), 400, 'Este horario ya no está disponible.');
      const overlap = await tx.appointment.findFirst({ where: { status: { in: ['REQUESTED', 'CONFIRMED'] }, OR: [{ psychologistId: match.psychologistId }, { patientId: match.patientId }], startsAt: { lt: slot.endsAt }, endsAt: { gt: slot.startsAt } } });
      assert(!overlap, 409, 'El horario se superpone con otra sesión. Elige uno diferente.');
      return tx.appointment.create({ data: { matchId, availabilityId, patientId: match.patientId, psychologistId: match.psychologistId, startsAt: slot.startsAt, endsAt: slot.endsAt } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (e) { if (e instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2004', 'P2010', 'P2002'].includes(e.code)) throw new AppError(409, 'Este horario acaba de reservarse. Selecciona otro.'); throw e; }
}
export async function updateAppointment(actor: Actor, id: string, action: 'confirm' | 'cancel' | 'complete') {
  const appointment = await db.appointment.findUnique({ where: { id } });
  assert(appointment, 404, 'Cita no encontrada.');
  await authorizedMatch(actor, appointment.matchId, action !== 'cancel');
  assert(appointment.status !== 'CANCELLED' && appointment.status !== 'COMPLETED', 409, 'Esta cita ya está cerrada.');
  if (action === 'complete') { assert(actor.role === 'PSYCHOLOGIST' && appointment.status === 'CONFIRMED' && appointment.endsAt <= new Date(), 400, 'Sólo puedes completar una sesión confirmada que ya terminó.'); }
  if (action === 'confirm') assert(appointment.startsAt > new Date(), 400, 'La fecha de la cita ya pasó.');
  if (action === 'cancel') assert(appointment.startsAt > new Date(), 400, 'No puedes cancelar una sesión cuya fecha ya pasó.');
  const data = action === 'cancel' ? { status: 'CANCELLED' as const } : action === 'complete' ? { status: 'COMPLETED' as const } : actor.role === 'PSYCHOLOGIST' ? { status: 'CONFIRMED' as const } : { patientConfirmedAt: new Date() };
  const result = await db.appointment.updateMany({ where: { id, status: appointment.status, ...(action === 'cancel' || action === 'confirm' ? { startsAt: { gt: new Date() } } : {}) }, data });
  assert(result.count === 1, 409, 'La cita cambió. Actualiza la página.');
  return { ok: true };
}
