import type { Actor } from '@/lib/auth';
import { assert } from '@/lib/errors';
import { adminDb, dataOrThrow, newId, timestamp } from '@/lib/supabase-admin';
import { restMatch } from './rest-connections';

export async function restBookAppointment(actor: Actor, matchId: string, availabilityId: string) {
  assert(actor.patient, 403, 'Sólo un paciente puede solicitar una sesión.');
  const match = await restMatch(actor, matchId);
  assert(match.patientId === actor.patient.id, 403, 'Sólo el paciente puede solicitar una sesión.');
  const db = adminDb();
  const slot = dataOrThrow<{ id: string; psychologistId: string; startsAt: string; endsAt: string }>(await db.from('Availability').select('*').eq('id', availabilityId).maybeSingle());
  assert(slot && slot.psychologistId === match.psychologistId && new Date(slot.startsAt) > new Date(), 400, 'Este horario ya no está disponible.');
  // PostgreSQL exclusion constraints reject simultaneous or overlapping reservations atomically.
  return dataOrThrow(await db.from('Appointment').insert({ id: newId(), matchId, availabilityId, patientId: match.patientId, psychologistId: match.psychologistId, startsAt: slot.startsAt, endsAt: slot.endsAt, createdAt: timestamp(), updatedAt: timestamp() }).select('*').single());
}

export async function restUpdateAppointment(actor: Actor, id: string, action: 'confirm' | 'cancel' | 'complete') {
  const db = adminDb();
  const appointment = dataOrThrow<{ id: string; matchId: string; startsAt: string; endsAt: string; status: 'REQUESTED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' }>(await db.from('Appointment').select('*').eq('id', id).maybeSingle());
  assert(appointment, 404, 'Cita no encontrada.');
  const match = await restMatch(actor, appointment.matchId, action !== 'cancel');
  assert((actor.patient && match.patientId === actor.patient.id) || (actor.psychologist && match.psychologistId === actor.psychologist.id), 403, 'Esta cita no está disponible.');
  assert(!['CANCELLED', 'COMPLETED'].includes(appointment.status), 409, 'Esta cita ya está cerrada.');
  if (action === 'complete') assert(actor.role === 'PSYCHOLOGIST' && appointment.status === 'CONFIRMED' && new Date(appointment.endsAt) <= new Date(), 400, 'Sólo puedes completar una sesión confirmada que ya terminó.');
  if (action === 'confirm') assert(new Date(appointment.startsAt) > new Date(), 400, 'La fecha de la cita ya pasó.');
  if (action === 'cancel') assert(new Date(appointment.startsAt) > new Date(), 400, 'No puedes cancelar una sesión cuya fecha ya pasó.');
  const change = action === 'cancel' ? { status: 'CANCELLED' as const } : action === 'complete' ? { status: 'COMPLETED' as const } : actor.role === 'PSYCHOLOGIST' ? { status: 'CONFIRMED' as const } : { patientConfirmedAt: timestamp() };
  let query = db.from('Appointment').update({ ...change, updatedAt: timestamp() }).eq('id', id).eq('status', appointment.status);
  if (action !== 'complete') query = query.gt('startsAt', timestamp());
  const result = dataOrThrow(await query.select('id'));
  assert(result.length === 1, 409, 'La cita cambió. Actualiza la página.');
  return { ok: true };
}

export async function restAvailability(actor: Actor, method: string, id: string | undefined, input?: { startsAt: string; endsAt: string }) {
  assert(actor.psychologist, 403, 'Esta función es para profesionales.');
  const db = adminDb();
  if (method === 'DELETE' && id) {
    const past = dataOrThrow<{ id: string }[]>(await db.from('Appointment').select('id').eq('availabilityId', id).limit(1));
    assert(!past.length, 409, 'No puedes eliminar un horario con historial de citas.');
    const result = dataOrThrow(await db.from('Availability').delete().eq('id', id).eq('psychologistId', actor.psychologist.id).select('id'));
    assert(result.length, 404, 'Horario no encontrado.');
    return { ok: true };
  }
  assert(method === 'POST' && input, 405, 'Método no permitido.');
  const startsAt = new Date(input.startsAt), endsAt = new Date(input.endsAt);
  const profile = dataOrThrow<{ duration: number }>(await db.from('PsychologistProfile').select('duration').eq('id', actor.psychologist.id).single());
  assert(startsAt > new Date() && startsAt.getTime() < Date.now() + 180 * 86400000 && endsAt.getTime() - startsAt.getTime() === profile.duration * 60000, 400, `El horario debe ser futuro y durar ${profile.duration} minutos.`);
  // no_availability_overlap protects concurrent writes in PostgreSQL.
  return dataOrThrow(await db.from('Availability').insert({ id: newId(), psychologistId: actor.psychologist.id, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), createdAt: timestamp(), updatedAt: timestamp() }).select('*').single());
}
