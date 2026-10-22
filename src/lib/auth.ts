import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { db } from './db';
import { assert } from './errors';
import { appUrl } from './env';
import type { Role } from '@prisma/client';
const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = 'psylink_session';
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, hash] = encoded.split(':');
  if (algorithm !== 'scrypt' || !salt || !hash) return false;
  const candidate = await scrypt(password, salt, 64) as Buffer;
  const expected = Buffer.from(hash, 'hex');
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}
export const userSelect = { id: true, email: true, name: true, role: true, isDemo: true, active: true, onboardingComplete: true, createdAt: true, patient: { select: { id: true, preferences: true } }, psychologist: { select: { id: true, verificationStatus: true } } } as const;
export async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: digest(token) }, include: { user: { select: userSelect } } });
  return session && session.expiresAt > new Date() && session.user.active ? session.user : null;
}
export type Actor = NonNullable<Awaited<ReturnType<typeof currentUser>>>;
export async function requireUser(roles?: Role[]) {
  const user = await currentUser();
  assert(user, 401, 'Inicia sesión para continuar.');
  assert(!roles || roles.includes(user.role), 403, 'No tienes permiso para realizar esta acción.');
  return user;
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + 7 * 86400000);
  await db.session.create({ data: { userId, tokenHash: digest(token), expiresAt: expires } });
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.VERCEL === '1' || appUrl().startsWith('https://'), path: '/', expires });
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: digest(token) } });
  jar.delete(SESSION_COOKIE);
}
export async function rateLimit(key: string, limit = 30, intervalMs = 60000) {
  const now = Date.now();
  const bucket = `${key}:${Math.floor(now / intervalMs)}`;
  const result = await db.rateLimit.upsert({ where: { key: bucket }, create: { key: bucket, expiresAt: new Date(now + intervalMs * 2) }, update: { count: { increment: 1 } } });
  assert(result.count <= limit, 429, 'Demasiados intentos. Espera un momento y vuelve a intentarlo.');
  // Bounded cleanup; keys contain only hashes or internal IDs, never emails or messages.
  if (Math.random() < .02) await db.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
export function checkOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get('origin');
  const allowed = new Set([requestUrl.origin, appUrl()]);
  if (requestUrl.hostname === '127.0.0.1' || requestUrl.hostname === 'localhost') {
    const localHost = requestUrl.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
    allowed.add(`${requestUrl.protocol}//${localHost}${requestUrl.port ? `:${requestUrl.port}` : ''}`);
  }
  assert(origin !== null && allowed.has(origin), 403, 'Origen de solicitud no permitido.');
}
