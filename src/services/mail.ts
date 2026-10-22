import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import { assert } from '@/lib/errors';
import { appUrl } from '@/lib/env';
export async function sendRecovery(to: string, token: string) {
  const origin = appUrl();
  const link = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
  const message = { from: process.env.MAIL_FROM || 'Psicomatch <no-reply@psicomatch.demo>', to, subject: 'Restablece tu contraseña de Psicomatch', text: `Solicitaste cambiar tu contraseña. Abre este enlace durante los próximos 30 minutos:\n${link}\nSi no fuiste tú, ignora este mensaje.` };
  if (process.env.MAIL_TRANSPORT === 'local') { assert(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname), 500, 'Configura SMTP para un entorno público.'); await mkdir('.local/mail', { recursive: true }); await writeFile(`.local/mail/${randomUUID()}.json`, JSON.stringify(message, null, 2), { mode: 0o600 }); return; }
  assert(process.env.SMTP_HOST, 503, 'El envío de correo aún no está configurado.');
  const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_PORT === '465', requireTLS: true, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }, disableFileAccess: true, disableUrlAccess: true });
  await transport.sendMail(message);
}
