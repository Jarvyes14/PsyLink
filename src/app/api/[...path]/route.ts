import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { assert, AppError } from '@/lib/errors';
import { checkOrigin, createSession, currentUser, digest, hashPassword, logout, rateLimit, requireUser, verifyPassword } from '@/lib/auth';
import { loginSchema, registerSchema, passwordSchema } from '@/lib/validation';
import { defaultStyles } from '@/domain/catalog';
import { savePatient, saveProfessional, discover, getProfessional } from '@/services/profiles';
import { patientAction, respondInterest, cancelMatch, conversationAccess } from '@/services/connections';
import { bookAppointment, updateAppointment } from '@/services/appointments';
import { overview, adminOverview } from '@/services/overview';
import { sendRecovery } from '@/services/mail';
import { storage, inspectFile, MAX_FILE_BYTES } from '@/services/storage';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path: string[] }> };
async function json(request: Request) { assert(Number(request.headers.get('content-length') || 0) <= 32768, 413, 'Solicitud demasiado grande.'); const text = await request.text(); assert(text.length <= 32768, 413, 'Solicitud demasiado grande.'); try { return JSON.parse(text) as unknown; } catch { throw new AppError(400, 'Formato de solicitud no válido.'); } }
async function route(request: Request, context: Context) {
  const { path } = await context.params;
  const [resource, id, action] = path;
  const method = request.method;
  const url = new URL(request.url);
  if (method !== 'GET') checkOrigin(request);
  if (resource === 'auth') {
    if (id === 'me' && method === 'GET') return { user: await currentUser() };
    if (id === 'logout' && method === 'POST') { await logout(); return { ok: true }; }
    assert(method === 'POST', 405, 'Método no permitido.');
    // Do not trust arbitrary forwarded IP headers. A global budget plus hashed account budget
    // protects the single-instance MVP; use trusted ingress IP limits for distributed deployment.
    await rateLimit('auth:global', 150, 60000);
    const input = await json(request);
    if (id === 'register') {
      const { email, name, password, role } = registerSchema.parse(input);
      await rateLimit(`register:${digest(email)}`, 5, 3600000);
      const passwordHash = await hashPassword(password);
      const user = await db.user.create({ data: { email, name, role, passwordHash, consentAt: new Date(), ...(role === 'PATIENT' ? { patient: { create: {} } } : { psychologist: { create: { styles: defaultStyles, languages: ['Español'] } } }) } });
      await createSession(user.id);
      return { role: user.role, onboardingComplete: false };
    }
    if (id === 'login') {
      const { email, password } = loginSchema.parse(input);
      await rateLimit(`login:${digest(email)}`, 12, 900000);
      const user = await db.user.findUnique({ where: { email } });
      const valid = await verifyPassword(password, user?.passwordHash || 'scrypt:00000000000000000000000000000000:' + '00'.repeat(64));
      assert(user && valid && user.active, 401, 'Correo o contraseña incorrectos, o cuenta no disponible.');
      await createSession(user.id);
      return { role: user.role, onboardingComplete: user.onboardingComplete };
    }
    if (id === 'forgot') {
      const { email } = loginSchema.pick({ email: true }).parse(input);
      await rateLimit(`reset:${digest(email)}`, 3, 3600000);
      const user = await db.user.findUnique({ where: { email } });
      if (user?.active) { const token = randomBytes(32).toString('base64url'); await db.passwordReset.create({ data: { userId: user.id, tokenHash: digest(token), expiresAt: new Date(Date.now() + 1800000) } }); await sendRecovery(email, token); }
      return { message: 'Si existe una cuenta con ese correo, recibirás instrucciones para restablecer tu contraseña.' };
    }
    if (id === 'reset') {
      const { token, password } = z.object({ token: z.string().min(32).max(128), password: passwordSchema }).parse(input);
      const reset = await db.passwordReset.findUnique({ where: { tokenHash: digest(token) } });
      assert(reset && !reset.usedAt && reset.expiresAt > new Date(), 400, 'El enlace no es válido o ya expiró. Solicita uno nuevo.');
      const passwordHash = await hashPassword(password);
      await db.$transaction(async tx => { const used = await tx.passwordReset.updateMany({ where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } }); assert(used.count === 1, 400, 'Este enlace ya se utilizó.'); await tx.user.update({ where: { id: reset.userId }, data: { passwordHash } }); await tx.session.deleteMany({ where: { userId: reset.userId } }); await tx.passwordReset.updateMany({ where: { userId: reset.userId, usedAt: null }, data: { usedAt: new Date() } }); });
      return { ok: true };
    }
    throw new AppError(404, 'Ruta no encontrada.');
  }
  const actor = await requireUser();
  if (method !== 'GET') await rateLimit(`write:${actor.id}`, 80);
  if (resource === 'overview' && method === 'GET') return overview(actor);
  if (resource === 'discover' && method === 'GET') return discover(actor, url.searchParams);
  if (resource === 'profiles' && method === 'GET' && id) return getProfessional(actor, id);
  if (resource === 'patient' && method === 'PUT') return savePatient(actor, await json(request));
  if (resource === 'professional' && method === 'PUT') return saveProfessional(actor, await json(request));
  if (resource === 'profiles' && id && method === 'POST') return patientAction(actor, id, z.enum(['interest', 'favorite', 'unfavorite', 'pass']).parse(action));
  if (resource === 'passes' && method === 'DELETE') { assert(actor.patient, 403, 'Acceso denegado.'); await db.passedProfile.deleteMany({ where: { patientId: actor.patient.id } }); return { ok: true }; }
  if (resource === 'interests' && id && method === 'POST') return respondInterest(actor, id, z.object({ accept: z.boolean() }).parse(await json(request)).accept);
  if (resource === 'matches' && id && method === 'DELETE') return cancelMatch(actor, id);
  if (resource === 'conversations' && id) {
    await conversationAccess(actor, id);
    if (method === 'GET') return db.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: 'asc' }, take: 500 });
    if (method === 'POST' && action === 'read') { await db.message.updateMany({ where: { conversationId: id, senderId: { not: actor.id }, readAt: null }, data: { readAt: new Date() } }); return { ok: true }; }
    if (method === 'POST') { const { body } = z.object({ body: z.string().trim().min(1).max(4000) }).parse(await json(request)); return db.message.create({ data: { conversationId: id, senderId: actor.id, body } }); }
  }
  if (resource === 'appointments' && method === 'POST') {
    if (id) return updateAppointment(actor, id, z.enum(['confirm', 'cancel', 'complete']).parse(action));
    const data = z.object({ matchId: z.string(), availabilityId: z.string() }).parse(await json(request));
    return bookAppointment(actor, data.matchId, data.availabilityId);
  }
  if (resource === 'availability') {
    assert(actor.psychologist, 403, 'Esta función es para profesionales.');
    if (method === 'POST') {
      const data = z.object({ startsAt: z.iso.datetime(), endsAt: z.iso.datetime() }).parse(await json(request));
      const startsAt = new Date(data.startsAt), endsAt = new Date(data.endsAt);
      const profile = await db.psychologistProfile.findUniqueOrThrow({ where: { id: actor.psychologist.id } });
      assert(startsAt > new Date() && startsAt.getTime() < Date.now() + 180 * 86400000 && endsAt.getTime() - startsAt.getTime() === profile.duration * 60000, 400, `El horario debe ser futuro y durar ${profile.duration} minutos.`);
      return db.$transaction(async tx => { const overlap = await tx.availability.findFirst({ where: { psychologistId: profile.id, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } }); assert(!overlap, 409, 'Este horario se superpone con otro.'); return tx.availability.create({ data: { psychologistId: profile.id, startsAt, endsAt } }); }, { isolationLevel: 'Serializable' });
    }
    if (method === 'DELETE' && id) { const result = await db.availability.deleteMany({ where: { id, psychologistId: actor.psychologist.id, appointments: { none: {} } } }); assert(result.count, 409, 'No puedes eliminar un horario con historial de citas.'); return { ok: true }; }
  }
  if (resource === 'files') {
    if (method === 'POST') {
      assert(actor.psychologist, 403, 'Esta función es para profesionales.');
      assert(Number(request.headers.get('content-length') || 0) <= 4.5 * 1024 * 1024, 413, 'El archivo es demasiado grande.');
      const form = await request.formData(); const file = form.get('file'); const kind = z.enum(['photo', 'document']).parse(form.get('kind'));
      assert(file instanceof File && file.size <= MAX_FILE_BYTES, 400, 'Selecciona un archivo de hasta 4 MB.');
      const bytes = Buffer.from(await file.arrayBuffer()); const mime = inspectFile(bytes, kind);
      const storageKey = await storage.put(bytes);
      try { const f = await db.storedFile.create({ data: { ownerId: actor.id, storageKey, mime, kind, name: file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) } }); return { id: f.id }; } catch (e) { await storage.remove(storageKey); throw e; }
    }
    if (method === 'GET' && id) {
      const file = await db.storedFile.findUnique({ where: { id } }); assert(file, 404, 'Archivo no encontrado.');
      const isPublicPhoto = file.kind === 'photo' && await db.psychologistProfile.findFirst({ where: { photoId: id, user: { active: true, onboardingComplete: true } } });
      assert(isPublicPhoto || file.ownerId === actor.id || actor.role === 'ADMIN', 404, 'Archivo no encontrado.');
      const bytes = await storage.get(file.storageKey);
      return new NextResponse(new Uint8Array(bytes), { headers: { 'Content-Type': file.mime, 'Content-Disposition': `${file.kind === 'document' ? 'attachment' : 'inline'}; filename="${file.name}"`, 'Cache-Control': 'private, no-store' } });
    }
  }
  if (resource === 'verification' && method === 'POST') {
    assert(actor.psychologist, 403, 'Esta función es para profesionales.');
    const { documentId, license } = z.object({ documentId: z.string(), license: z.string().trim().min(3).max(100) }).parse(await json(request));
    assert(await db.storedFile.findFirst({ where: { id: documentId, ownerId: actor.id, kind: 'document' } }), 400, 'Adjunta un documento de tu cuenta.');
    return db.$transaction(async tx => { const p = await tx.psychologistProfile.updateMany({ where: { id: actor.psychologist!.id, verificationStatus: { in: ['UNVERIFIED', 'REJECTED'] } }, data: { verificationStatus: 'PENDING', license } }); assert(p.count, 409, 'Tu verificación ya está en revisión o aprobada.'); return tx.professionalVerification.create({ data: { psychologistId: actor.psychologist!.id, documentId, license } }); });
  }
  if (resource === 'reports' && method === 'POST') {
    const data = z.object({ targetId: z.string(), reason: z.string().trim().min(10).max(2000) }).parse(await json(request));
    assert(data.targetId !== actor.id && await db.user.findUnique({ where: { id: data.targetId } }), 400, 'Selecciona un perfil válido.');
    return db.report.create({ data: { ...data, reporterId: actor.id } });
  }
  if (resource === 'blocks' && method === 'GET') return db.block.findMany({ where: { blockerId: actor.id }, select: { id: true, blockedId: true, blocked: { select: { name: true } } } });
  if (resource === 'blocks' && method === 'DELETE' && id) { await db.block.deleteMany({ where: { id, blockerId: actor.id } }); return { ok: true }; }
  if (resource === 'blocks' && method === 'POST') {
    const { targetId } = z.object({ targetId: z.string() }).parse(await json(request));
    assert(targetId !== actor.id && await db.user.findUnique({ where: { id: targetId } }), 400, 'Cuenta no válida.');
    await db.$transaction(async tx => {
      await tx.block.upsert({ where: { blockerId_blockedId: { blockerId: actor.id, blockedId: targetId } }, create: { blockerId: actor.id, blockedId: targetId }, update: {} });
      const matches = await tx.match.findMany({ where: { OR: [{ patient: { userId: actor.id }, psychologist: { userId: targetId } }, { patient: { userId: targetId }, psychologist: { userId: actor.id } }] } });
      await tx.match.updateMany({ where: { id: { in: matches.map(m => m.id) } }, data: { active: false } });
      await tx.appointment.updateMany({ where: { matchId: { in: matches.map(m => m.id) }, startsAt: { gt: new Date() }, status: { in: ['REQUESTED', 'CONFIRMED'] } }, data: { status: 'CANCELLED' } });
    }); return { ok: true };
  }
  if (resource === 'account' && method === 'DELETE') {
    const { password } = z.object({ password: z.string().max(128) }).parse(await json(request));
    const user = await db.user.findUniqueOrThrow({ where: { id: actor.id } }); assert(await verifyPassword(password, user.passwordHash), 401, 'Confirma tu contraseña.'); assert(actor.role !== 'ADMIN', 403, 'La cuenta administradora requiere una transferencia de administración.');
    const files = await db.storedFile.findMany({ where: { ownerId: actor.id } });
    for (const file of files) await storage.remove(file.storageKey);
    await db.user.delete({ where: { id: actor.id } }); await logout(); return { ok: true };
  }
  if (resource === 'admin') {
    assert(actor.role === 'ADMIN', 403, 'Acceso restringido a administración.');
    if (method === 'GET') return adminOverview();
    if (id === 'verifications' && action && method === 'POST') {
      const { status, reviewNote } = z.object({ status: z.enum(['VERIFIED', 'REJECTED']), reviewNote: z.string().trim().min(5).max(1000) }).parse(await json(request));
      return db.$transaction(async tx => { const v = await tx.professionalVerification.findUnique({ where: { id: action } }); assert(v && v.status === 'PENDING', 409, 'Esta solicitud ya fue revisada.'); const updated = await tx.professionalVerification.updateMany({ where: { id: action, status: 'PENDING' }, data: { status, reviewNote, reviewedBy: actor.id, reviewedAt: new Date() } }); assert(updated.count, 409, 'Otra persona ya revisó esta solicitud.'); await tx.psychologistProfile.update({ where: { id: v.psychologistId }, data: { verificationStatus: status } }); return { ok: true }; });
    }
    if (id === 'users' && action && method === 'POST') {
      const { active } = z.object({ active: z.boolean() }).parse(await json(request));
      const target = await db.user.findUnique({ where: { id: action } }); assert(target && target.role !== 'ADMIN', 400, 'No puedes desactivar administradores.');
      await db.$transaction(async tx => { await tx.user.update({ where: { id: action }, data: { active } }); if (!active) { await tx.session.deleteMany({ where: { userId: action } }); await tx.appointment.updateMany({ where: { OR: [{ patient: { userId: action } }, { psychologist: { userId: action } }], startsAt: { gt: new Date() }, status: { in: ['REQUESTED', 'CONFIRMED'] } }, data: { status: 'CANCELLED' } }); } }); return { ok: true };
    }
    if (id === 'reports' && action && method === 'POST') {
      const { resolution } = z.object({ resolution: z.string().trim().min(5).max(1000) }).parse(await json(request));
      return db.report.update({ where: { id: action }, data: { status: 'RESOLVED', resolution } });
    }
  }
  throw new AppError(404, 'Ruta no encontrada.');
}
async function handler(request: Request, context: Context) {
  try { const data = await route(request, context); if (data instanceof Response) return data; return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') }, { status: 400 });
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof Prisma.PrismaClientKnownRequestError) { if (e.code === 'P2002') return NextResponse.json({ error: 'Este registro ya existe. Revisa tus datos.' }, { status: 409 }); if (['P2034', 'P2004'].includes(e.code)) return NextResponse.json({ error: 'La operación coincide con otro cambio. Actualiza e intenta de nuevo.' }, { status: 409 }); if (e.code === 'P2025') return NextResponse.json({ error: 'Registro no encontrado.' }, { status: 404 }); }
    // Never log request bodies, credentials or clinical information.
    console.error('API failure', e instanceof Error ? e.name : 'UnknownError');
    return NextResponse.json({ error: 'No pudimos completar la operación. Inténtalo de nuevo.' }, { status: 500 });
  }
}
export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
