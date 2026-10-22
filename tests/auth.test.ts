import { describe, expect, it } from 'vitest';
import { checkOrigin, hashPassword, verifyPassword, digest } from '@/lib/auth';
describe('credenciales', () => {
  it('hashea con salt único y verifica sin guardar el secreto', async () => { const a = await hashPassword('UnaClaveMuySegura123'); const b = await hashPassword('UnaClaveMuySegura123'); expect(a).not.toBe(b); expect(a).not.toContain('UnaClaveMuySegura123'); expect(await verifyPassword('UnaClaveMuySegura123', a)).toBe(true); expect(await verifyPassword('incorrecta', a)).toBe(false); });
  it('genera una huella estable para tokens', () => { expect(digest('token')).toBe(digest('token')); expect(digest('token')).not.toBe(digest('otro')); });
  it('acepta localhost y 127.0.0.1 como el mismo origen local', () => {
    const request = new Request('http://127.0.0.1:3000/api/auth/register', { headers: { origin: 'http://localhost:3000' } });
    expect(() => checkOrigin(request)).not.toThrow();
    const external = new Request('http://127.0.0.1:3000/api/auth/register', { headers: { origin: 'https://example.com' } });
    expect(() => checkOrigin(external)).toThrow('Origen de solicitud no permitido.');
  });
});
