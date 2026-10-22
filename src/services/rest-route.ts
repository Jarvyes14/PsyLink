import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assert, AppError } from '@/lib/errors';
import { checkOrigin, currentUser, requireUser, logout } from '@/lib/auth';
import { adminDb, dataOrThrow, newId, timestamp } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { storage, inspectFile, MAX_FILE_BYTES } from './storage';
import { restDiscover, restProfessional, restSavePatient, restSaveProfessional } from './rest-profiles';
import { restPatientAction, restRespondInterest, restCancelMatch, restConversationAccess } from './rest-connections';
import { restBookAppointment, restUpdateAppointment, restAvailability } from './rest-appointments';
import { restOverview, restAdminOverview } from './rest-overview';

async function body(request: Request) {
  assert(Number(request.headers.get('content-length') || 0) <= 32768, 413, 'Solicitud demasiado grande.');
  const raw = await request.text();
  assert(raw.length <= 32768, 413, 'Solicitud demasiado grande.');
  try { return JSON.parse(raw) as unknown; } catch { throw new AppError(400, 'Formato de solicitud no válido.'); }
}

async function restFile(actorId: string | null, role: string | null, id: string) {
  const db = adminDb();
  const file = dataOrThrow<{ id: string; ownerId: string; storageKey: string; mime: string; name: string; kind: string }>(await db.from('StoredFile').select('*').eq('id', id).maybeSingle());
  assert(file, 404, 'Archivo no encontrado.');
  const profile = file.kind === 'photo' ? dataOrThrow<{ user: { active: boolean; onboardingComplete: boolean } }>(await db.from('PsychologistProfile').select('user:User(active,onboardingComplete)').eq('photoId', id).maybeSingle()) : null;
  const publicPhoto = !!profile?.user.active && !!profile.user.onboardingComplete;
  assert(publicPhoto || file.ownerId === actorId || role === 'ADMIN', 404, 'Archivo no encontrado.');
  const bytes = await storage.get(file.storageKey);
  return new NextResponse(new Uint8Array(bytes), { headers: { 'Content-Type': file.mime, 'Content-Disposition': `${file.kind === 'document' ? 'attachment' : 'inline'}; filename="${file.name}"`, 'Cache-Control': publicPhoto ? 'public, max-age=300' : 'private, no-store' } });
}

export async function restRoute(request: Request, path: string[]) {
  const [resource, id, action] = path;
  const method = request.method;
  if (method !== 'GET') checkOrigin(request);
  const url = new URL(request.url);
  if (resource === 'discover' && method === 'GET') return restDiscover(await currentUser(), url.searchParams);
  if (resource === 'profiles' && method === 'GET' && id) return restProfessional(await currentUser(), id);
  if (resource === 'files' && method === 'GET' && id) {
    const actor = await currentUser();
    return restFile(actor?.id || null, actor?.role || null, id);
  }
  const actor = await requireUser();
  const db = adminDb();
  if (method !== 'GET') {
    const allowed = dataOrThrow(await db.rpc('consume_rate_limit', { p_key: `write:${actor.id}`, p_limit: 80, p_window_seconds: 60 }));
    assert(allowed, 429, 'Demasiados intentos. Espera un momento y vuelve a intentarlo.');
  }
  if (resource === 'overview' && method === 'GET') return restOverview(actor);
  if (resource === 'patient' && method === 'PUT') return restSavePatient(actor, await body(request));
  if (resource === 'professional' && method === 'PUT') return restSaveProfessional(actor, await body(request));
  if (resource === 'profiles' && id && method === 'POST') return restPatientAction(actor, id, z.enum(['interest', 'favorite', 'unfavorite', 'pass']).parse(action));
  if (resource === 'passes' && method === 'DELETE') { assert(actor.patient, 403, 'Acceso denegado.'); dataOrThrow(await db.from('PassedProfile').delete().eq('patientId', actor.patient.id).select('psychologistId')); return { ok: true }; }
  if (resource === 'interests' && id && method === 'POST') return restRespondInterest(actor, id, z.object({ accept: z.boolean() }).parse(await body(request)).accept);
  if (resource === 'matches' && id && method === 'DELETE') return restCancelMatch(actor, id);
  if (resource === 'conversations' && id) {
    await restConversationAccess(actor, id);
    if (method === 'GET') return dataOrThrow(await db.from('Message').select('*').eq('conversationId', id).order('createdAt').limit(500));
    if (method === 'POST' && action === 'read') { dataOrThrow(await db.from('Message').update({ readAt: timestamp(), updatedAt: timestamp() }).eq('conversationId', id).neq('senderId', actor.id).is('readAt', null).select('id')); return { ok: true }; }
    if (method === 'POST') { const { body: message } = z.object({ body: z.string().trim().min(1).max(4000) }).parse(await body(request)); return dataOrThrow(await db.from('Message').insert({ id: newId(), conversationId: id, senderId: actor.id, body: message, createdAt: timestamp(), updatedAt: timestamp() }).select('*').single()); }
  }
  if (resource === 'appointments' && method === 'POST') {
    if (id) return restUpdateAppointment(actor, id, z.enum(['confirm', 'cancel', 'complete']).parse(action));
    const input = z.object({ matchId: z.string(), availabilityId: z.string() }).parse(await body(request));
    return restBookAppointment(actor, input.matchId, input.availabilityId);
  }
  if (resource === 'availability') {
    const input = method === 'POST' ? z.object({ startsAt: z.iso.datetime(), endsAt: z.iso.datetime() }).parse(await body(request)) : undefined;
    return restAvailability(actor, method, id, input);
  }
  if (resource === 'files' && method === 'POST') {
    assert(actor.psychologist, 403, 'Esta función es para profesionales.');
    assert(Number(request.headers.get('content-length') || 0) <= 4.5 * 1024 * 1024, 413, 'El archivo es demasiado grande.');
    const form = await request.formData(); const file = form.get('file'); const kind = z.enum(['photo', 'document']).parse(form.get('kind'));
    assert(file instanceof File && file.size <= MAX_FILE_BYTES, 400, 'Selecciona un archivo de hasta 4 MB.');
    const bytes = Buffer.from(await file.arrayBuffer()); const mime = inspectFile(bytes, kind); const storageKey = await storage.put(bytes);
    try { const saved = dataOrThrow(await db.from('StoredFile').insert({ id: newId(), ownerId: actor.id, storageKey, mime, kind, name: file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120), createdAt: timestamp(), updatedAt: timestamp() }).select('id').single()); return saved; }
    catch (error) { await storage.remove(storageKey); throw error; }
  }
  if (resource === 'verification' && method === 'POST') {
    assert(actor.psychologist, 403, 'Esta función es para profesionales.');
    const { documentId, license } = z.object({ documentId: z.string(), license: z.string().trim().min(3).max(100) }).parse(await body(request));
    const file = dataOrThrow(await db.from('StoredFile').select('id').eq('id', documentId).eq('ownerId', actor.id).eq('kind', 'document').maybeSingle());
    assert(file, 400, 'Adjunta un documento de tu cuenta.');
    const pending = dataOrThrow(await db.from('PsychologistProfile').update({ verificationStatus: 'PENDING', license, updatedAt: timestamp() }).eq('id', actor.psychologist.id).in('verificationStatus', ['UNVERIFIED', 'REJECTED']).select('id'));
    assert(pending.length === 1, 409, 'Tu verificación ya está en revisión o aprobada.');
    return dataOrThrow(await db.from('ProfessionalVerification').insert({ id: newId(), psychologistId: actor.psychologist.id, documentId, license, createdAt: timestamp(), updatedAt: timestamp() }).select('*').single());
  }
  if (resource === 'reports' && method === 'POST') {
    const input = z.object({ targetId: z.string(), reason: z.string().trim().min(10).max(2000) }).parse(await body(request));
    const target = dataOrThrow(await db.from('User').select('id').eq('id', input.targetId).maybeSingle());
    assert(target && input.targetId !== actor.id, 400, 'Selecciona un perfil válido.');
    return dataOrThrow(await db.from('Report').insert({ id: newId(), ...input, reporterId: actor.id, createdAt: timestamp(), updatedAt: timestamp() }).select('*').single());
  }
  if (resource === 'blocks' && method === 'GET') return dataOrThrow(await db.from('Block').select('id,blockedId,blocked:User!Block_blockedId_fkey(name)').eq('blockerId', actor.id));
  if (resource === 'blocks' && method === 'DELETE' && id) { dataOrThrow(await db.from('Block').delete().eq('id', id).eq('blockerId', actor.id).select('id')); return { ok: true }; }
  if (resource === 'blocks' && method === 'POST') {
    const { targetId } = z.object({ targetId: z.string() }).parse(await body(request));
    const target = dataOrThrow(await db.from('User').select('id').eq('id', targetId).maybeSingle());
    assert(target && targetId !== actor.id, 400, 'Cuenta no válida.');
    dataOrThrow(await db.from('Block').upsert({ id: newId(), blockerId: actor.id, blockedId: targetId, createdAt: timestamp(), updatedAt: timestamp() }, { onConflict: 'blockerId,blockedId', ignoreDuplicates: true }).select('id'));
    const profiles = dataOrThrow<{ id: string; userId: string }[]>(await db.from('PatientProfile').select('id,userId').in('userId', [actor.id, targetId]));
    const professionals = dataOrThrow<{ id: string; userId: string }[]>(await db.from('PsychologistProfile').select('id,userId').in('userId', [actor.id, targetId]));
    const matches = dataOrThrow<{ id: string }[]>(await db.from('Match').select('id').or(`and(patientId.eq.${profiles.find(p => p.userId === actor.id)?.id || '__none__'},psychologistId.eq.${professionals.find(p => p.userId === targetId)?.id || '__none__'}),and(patientId.eq.${profiles.find(p => p.userId === targetId)?.id || '__none__'},psychologistId.eq.${professionals.find(p => p.userId === actor.id)?.id || '__none__'})`));
    if (matches.length) {
      const ids = matches.map(m => m.id);
      dataOrThrow(await db.from('Match').update({ active: false, updatedAt: timestamp() }).in('id', ids).select('id'));
      dataOrThrow(await db.from('Appointment').update({ status: 'CANCELLED', updatedAt: timestamp() }).in('matchId', ids).gt('startsAt', timestamp()).in('status', ['REQUESTED', 'CONFIRMED']).select('id'));
    }
    return { ok: true };
  }
  if (resource === 'account' && method === 'DELETE') {
    assert(actor.role !== 'ADMIN', 403, 'La cuenta administradora requiere una transferencia de administración.');
    const { password } = z.object({ password: z.string().max(128) }).parse(await body(request));
    const supabase = await createSupabaseServerClient();
    const checked = await supabase.auth.signInWithPassword({ email: actor.email, password });
    assert(!checked.error && checked.data.user, 401, 'Confirma tu contraseña.');
    const files = dataOrThrow<{ storageKey: string }[]>(await db.from('StoredFile').select('storageKey').eq('ownerId', actor.id));
    dataOrThrow(await db.from('User').update({ active: false, updatedAt: timestamp() }).eq('id', actor.id).select('id'));
    const deleted = await db.auth.admin.deleteUser(checked.data.user.id);
    assert(!deleted.error, 502, 'No pudimos eliminar la cuenta. Contacta a soporte.');
    dataOrThrow(await db.from('User').delete().eq('id', actor.id).select('id'));
    for (const file of files) await storage.remove(file.storageKey);
    await logout(); return { ok: true };
  }
  if (resource === 'admin') {
    assert(actor.role === 'ADMIN', 403, 'Acceso restringido a administración.');
    if (method === 'GET') return restAdminOverview();
    if (id === 'verifications' && action && method === 'POST') {
      const { status, reviewNote } = z.object({ status: z.enum(['VERIFIED', 'REJECTED']), reviewNote: z.string().trim().min(5).max(1000) }).parse(await body(request));
      const reviewed = dataOrThrow<{ psychologistId: string }[]>(await db.from('ProfessionalVerification').update({ status, reviewNote, reviewedBy: actor.id, reviewedAt: timestamp(), updatedAt: timestamp() }).eq('id', action).eq('status', 'PENDING').select('psychologistId'));
      assert(reviewed.length === 1, 409, 'Esta solicitud ya fue revisada.');
      dataOrThrow(await db.from('PsychologistProfile').update({ verificationStatus: status, updatedAt: timestamp() }).eq('id', reviewed[0].psychologistId).select('id'));
      return { ok: true };
    }
    if (id === 'users' && action && method === 'POST') {
      const { active } = z.object({ active: z.boolean() }).parse(await body(request));
      const target = dataOrThrow<{ id: string; role: string }>(await db.from('User').select('id,role').eq('id', action).maybeSingle());
      assert(target && target.role !== 'ADMIN', 400, 'No puedes desactivar administradores.');
      dataOrThrow(await db.from('User').update({ active, updatedAt: timestamp() }).eq('id', action).select('id'));
      if (!active) {
        const p = dataOrThrow<{ id: string }>(await db.from('PatientProfile').select('id').eq('userId', action).maybeSingle());
        const q = dataOrThrow<{ id: string }>(await db.from('PsychologistProfile').select('id').eq('userId', action).maybeSingle());
        const list = p ? dataOrThrow<{ id: string }[]>(await db.from('Match').select('id').eq('patientId', p.id)) : q ? dataOrThrow<{ id: string }[]>(await db.from('Match').select('id').eq('psychologistId', q.id)) : [];
        if (list.length) dataOrThrow(await db.from('Appointment').update({ status: 'CANCELLED', updatedAt: timestamp() }).in('matchId', list.map(m => m.id)).gt('startsAt', timestamp()).in('status', ['REQUESTED', 'CONFIRMED']).select('id'));
      }
      return { ok: true };
    }
    if (id === 'reports' && action && method === 'POST') {
      const { resolution } = z.object({ resolution: z.string().trim().min(5).max(1000) }).parse(await body(request));
      return dataOrThrow(await db.from('Report').update({ status: 'RESOLVED', resolution, updatedAt: timestamp() }).eq('id', action).select('*').single());
    }
  }
  throw new AppError(404, 'Ruta no encontrada.');
}
