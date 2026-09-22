import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword, digest } from '@/lib/auth';
describe('credenciales', () => {
  it('hashea con salt único y verifica sin guardar el secreto', async () => { const a = await hashPassword('UnaClaveMuySegura123'); const b = await hashPassword('UnaClaveMuySegura123'); expect(a).not.toBe(b); expect(a).not.toContain('UnaClaveMuySegura123'); expect(await verifyPassword('UnaClaveMuySegura123', a)).toBe(true); expect(await verifyPassword('incorrecta', a)).toBe(false); });
  it('genera una huella estable para tokens', () => { expect(digest('token')).toBe(digest('token')); expect(digest('token')).not.toBe(digest('otro')); });
});
