import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';
import { defaultStyles, specialties, approaches } from '../src/domain/catalog';
import { storage } from '../src/services/storage';
const db = new PrismaClient();
const names = ['Valeria Montes', 'Daniel Ríos', 'Lucía Navarro', 'Andrés Solís', 'Camila Ortega', 'Mateo Serrano', 'Elena Vidal', 'Gabriel Fuentes', 'Mariana León', 'Sofía Robles', 'Emiliano Vega', 'Renata Castro', 'Diego Molina', 'Natalia Paz', 'Julián Herrera', 'Paula Miranda', 'Sebastián Luna', 'Andrea Campos', 'Nicolás Torres', 'Isabel Méndez', 'Tomás Aguilar', 'Carolina Reyes', 'Santiago Flores', 'Ana Beltrán', 'Rodrigo Salas'];
async function main() {
  if (!process.env.DEMO_PASSWORD || process.env.DEMO_PASSWORD.length < 12) throw new Error('Run npm run setup:env or set a strong DEMO_PASSWORD.');
  const passwordHash = await hashPassword(process.env.DEMO_PASSWORD);
  for (const [id, name] of specialties) await db.specialty.upsert({ where: { id }, create: { id, name }, update: { name } });
  for (const [id, name, description] of approaches) await db.therapeuticApproach.upsert({ where: { id }, create: { id, name, description }, update: { name, description } });
  const userBase = { passwordHash, consentAt: new Date(), onboardingComplete: true };
  await db.user.upsert({ where: { email: 'admin@psylink.demo' }, create: { ...userBase, name: 'Administración Demo', email: 'admin@psylink.demo', role: 'ADMIN' }, update: {} });
  const patients = [];
  for (let i = 0; i < 10; i++) {
    const email = i === 0 ? 'patient@psylink.demo' : `patient${i + 1}@psylink.demo`;
    const u = await db.user.upsert({ where: { email }, create: { ...userBase, email, name: ['Alex García', 'Sam Rivera', 'Dani Cruz', 'Andrea Ortiz', 'Pablo Méndez', 'Ana Ruiz', 'Luis Pérez', 'Julia López', 'Carlos Díaz', 'Laura Ramos'][i], role: 'PATIENT', patient: { create: { preferences: { create: { goals: [specialties[i % 10][0], 'emotions'], expectations: ['Quiero herramientas prácticas'], modality: 'ONLINE', budget: 900, availability: 'AFTERNOON', approaches: [], styles: { ...defaultStyles, practice: 20, formality: 80 } } } } } }, update: {}, include: { patient: true } });
    patients.push(u.patient!);
  }
  const psychologists = [];
  for (let i = 0; i < 25; i++) {
    const email = i === 0 ? 'psychologist@psylink.demo' : `psychologist${i + 1}@psylink.demo`;
    const s = specialties[i % specialties.length];
    const a = approaches[i % (approaches.length - 1)];
    const styles = { structure: 20 + i % 4 * 20, direction: 40 + i % 3 * 20, practice: 20 + i % 5 * 15, formality: 75, time: 25 + i % 4 * 15, participation: 65, pace: 60 };
    const u = await db.user.upsert({ where: { email }, create: { ...userBase, email, name: names[i], role: 'PSYCHOLOGIST', psychologist: { create: {
      pronouns: i % 2 ? 'él' : 'ella', gender: i % 2 ? 'Hombre' : 'Mujer',
      bio: `Soy ${names[i]}. Acompaño a personas que quieren trabajar ${s[1].toLowerCase()} desde un espacio de escucha, respeto y colaboración. Mi forma de trabajar combina conversaciones cuidadosas con objetivos que acordamos a tu ritmo. Este es un perfil ficticio para explorar PsyLink.`,
      city: ['Ciudad de México · ubicación demo', 'Guadalajara · ubicación demo', 'Monterrey · ubicación demo', 'Puebla · ubicación demo', 'Querétaro · ubicación demo'][i % 5],
      modality: i % 5 === 4 ? 'IN_PERSON' : i % 3 === 0 ? 'BOTH' : 'ONLINE', languages: i % 3 === 0 ? ['Español', 'Inglés'] : ['Español'],
      yearsExperience: 3 + i % 14, education: 'Licenciatura en Psicología · Formación de posgrado en intervención psicológica (demo)', university: 'Universidad del Centro · institución ficticia',
      license: `DEMO-${100000 + i}`, certifications: `Formación continua en ${a[1].toLowerCase()} y ética profesional (datos demo).`, price: 450 + i % 9 * 100, duration: 50,
      population: i % 4 === 0 ? 'Adultos y parejas' : 'Adultos', ageRange: '18 a 75 años', experience: 'Consulta individual y acompañamiento en centros comunitarios ficticios. Experiencia en procesos de cambio y bienestar emocional.',
      accessibility: i % 2 ? 'Atención online con subtítulos bajo solicitud.' : 'Acceso sin escalones en consulta demo. Atención online con subtítulos bajo solicitud.',
      tools: 'Registro de experiencias, ejercicios de reflexión y recursos acordados contigo.', firstSession: 'Conversaremos sobre lo que te trae aquí, tus expectativas y cómo podemos trabajar. También habrá espacio para tus preguntas; no necesitas tener todo claro.',
      expectations: 'Un espacio respetuoso, objetivos compartidos y revisión periódica del proceso.', goalSetting: 'Acordamos objetivos contigo y revisamos su utilidad durante las sesiones.',
      homework: i % 2 ? 'Propongo actividades opcionales entre sesiones, según tus objetivos.' : 'Podemos acordar ejercicios cuando sean útiles para tu proceso.',
      philosophy: 'Cada historia merece ser escuchada con atención. El proceso se construye en colaboración y puede ajustarse a lo que necesites.',
      styles, verificationStatus: i < 19 ? 'VERIFIED' : i < 22 ? 'PENDING' : i === 22 ? 'REJECTED' : 'UNVERIFIED',
      specialties: { create: [...new Set([s[0], 'emotions'])].map(specialtyId => ({ specialtyId })) }, approaches: { create: [{ approachId: a[0] }] },
    } } }, update: {}, include: { psychologist: true } });
    const p = u.psychologist!; psychologists.push(p);
    for (let day = 1; day <= 14; day++) {
      const date = new Date(); date.setUTCDate(date.getUTCDate() + day); date.setUTCHours(19 + (day % 3), 0, 0, 0);
      await db.availability.upsert({ where: { psychologistId_startsAt: { psychologistId: p.id, startsAt: date } }, create: { psychologistId: p.id, startsAt: date, endsAt: new Date(date.getTime() + 50 * 60000) }, update: {} });
    }
    if (i >= 19 && i < 23 && !(await db.professionalVerification.count({ where: { psychologistId: p.id } }))) {
      const bytes = Buffer.from('%PDF-1.4\n% PsyLink demo credential. Not a real professional license.\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
      const file = await db.storedFile.create({ data: { ownerId: u.id, kind: 'document', name: 'credencial-ficticia-demo.pdf', mime: 'application/pdf', storageKey: await storage.put(bytes) } });
      await db.professionalVerification.create({ data: { psychologistId: p.id, documentId: file.id, license: p.license, status: i === 22 ? 'REJECTED' : 'PENDING', reviewNote: i === 22 ? 'Documento demo incompleto. Adjunta la constancia completa.' : '' } });
    }
  }
  for (let i = 0; i < 4; i++) {
    const patient = patients[i === 0 ? 0 : i]; const p = psychologists[i]; const pair = { patientId: patient.id, psychologistId: p.id };
    await db.interest.upsert({ where: { patientId_psychologistId: pair }, create: { ...pair, status: 'ACCEPTED' }, update: {} });
    const match = await db.match.upsert({ where: { patientId_psychologistId: pair }, create: { ...pair, conversation: { create: {} } }, update: {}, include: { conversation: true } });
    if (match.conversation && !(await db.message.count({ where: { conversationId: match.conversation.id } }))) {
      await db.message.createMany({ data: [ { conversationId: match.conversation.id, senderId: p.userId, body: 'Hola, gracias por conectar. Podemos usar este espacio para resolver tus dudas sobre la primera sesión.' }, { conversationId: match.conversation.id, senderId: patient.userId, body: 'Gracias. Me gustaría conocer cómo suele ser la primera sesión.', readAt: new Date() } ] });
    }
    const slot = await db.availability.findFirstOrThrow({ where: { psychologistId: p.id, startsAt: { gt: new Date() } }, orderBy: { startsAt: 'asc' } });
    if (!(await db.appointment.count({ where: { matchId: match.id } }))) await db.appointment.create({ data: { ...pair, matchId: match.id, availabilityId: slot.id, startsAt: slot.startsAt, endsAt: slot.endsAt, status: i % 2 ? 'REQUESTED' : 'CONFIRMED' } });
  }
  for (let i = 1; i < 4; i++) {
    const pair = { patientId: patients[i].id, psychologistId: psychologists[0].id };
    await db.interest.upsert({ where: { patientId_psychologistId: pair }, create: pair, update: {} });
    const favorite = { patientId: patients[0].id, psychologistId: psychologists[i].id };
    await db.favorite.upsert({ where: { patientId_psychologistId: favorite }, create: favorite, update: {} });
  }
  if (!(await db.report.count())) await db.report.create({ data: { reporterId: patients[0].userId, targetId: psychologists[22].userId, reason: 'Reporte demo: la información de formación del perfil necesita revisión.' } });
  console.log('Seed complete: 1 admin, 10 patients, 25 psychologists, matches, messages, appointments and private demo documents.');
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => db.$disconnect());
