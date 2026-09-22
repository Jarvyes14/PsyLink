import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { db } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';
import { patientAction, respondInterest, conversationAccess } from '../src/services/connections';
import { bookAppointment } from '../src/services/appointments';
import { defaultStyles } from '../src/domain/catalog';
async function main() {
  assert.equal(await db.user.count({ where: { role: 'ADMIN' } }), 1);
  assert.ok(await db.psychologistProfile.count() >= 25);
  const suffix = randomUUID(); const passwordHash = await hashPassword('IntegrationPassword123');
  const patientUser = await db.user.create({ data: { email: `integration-p-${suffix}@test.local`, name: 'Paciente Integración', role: 'PATIENT', active: true, consentAt: new Date(), onboardingComplete: true, passwordHash, patient: { create: { preferences: { create: { goals: ['anxiety'], expectations: [], modality: 'ONLINE', budget: 900, availability: 'ANY', language: 'Español', gender: 'ANY', minExperience: 0, approaches: [], communication: 'ANY', frequency: 'Semanal', strictBudget: false, strictModality: false, styles: defaultStyles } } } } }, include: { patient: { include: { preferences: true } }, psychologist: true } });
  const proUser = await db.user.create({ data: { email: `integration-pro-${suffix}@test.local`, name: 'Profesional Integración', role: 'PSYCHOLOGIST', active: true, consentAt: new Date(), onboardingComplete: true, passwordHash, psychologist: { create: { bio: 'Perfil temporal creado para validar los flujos de integración de PsyLink.', city: 'Demo', modality: 'ONLINE', languages: ['Español'], styles: defaultStyles, acceptingPatients: true } } }, include: { patient: true, psychologist: true } });
  try {
    const patientActor = { ...patientUser, psychologist: null };
    const proActor = { ...proUser, patient: null };
    await patientAction(patientActor, proUser.psychologist!.id, 'interest');
    const interest = await db.interest.findUniqueOrThrow({ where: { patientId_psychologistId: { patientId: patientUser.patient!.id, psychologistId: proUser.psychologist!.id } } });
    const match = await respondInterest(proActor, interest.id, true);
    assert.ok('id' in match);
    const fullMatch = await db.match.findUniqueOrThrow({ where: { patientId_psychologistId: { patientId: patientUser.patient!.id, psychologistId: proUser.psychologist!.id } }, include: { conversation: true } });
    assert.ok(fullMatch.conversation);
    await conversationAccess(patientActor, fullMatch.conversation!.id);
    await assert.rejects(() => conversationAccess({ ...patientActor, id: 'unauthorized-user' }, fullMatch.conversation!.id));
    const startsAt = new Date(Date.now() + 7 * 86400000); const endsAt = new Date(startsAt.getTime() + 50 * 60000);
    const slot = await db.availability.create({ data: { psychologistId: proUser.psychologist!.id, startsAt, endsAt } });
    await bookAppointment(patientActor, fullMatch.id, slot.id);
    await assert.rejects(() => bookAppointment(patientActor, fullMatch.id, slot.id));
    console.log('Integration checks passed: seed, interests, match, conversation authorization, appointments and double-booking protection.');
  } finally { await db.user.deleteMany({ where: { email: { in: [patientUser.email, proUser.email] } } }); await db.$disconnect(); }
}
main().catch(e => { console.error(e); process.exit(1); });
