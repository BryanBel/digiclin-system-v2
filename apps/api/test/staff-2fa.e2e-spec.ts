import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { user } from '../src/db/schema/index.js';

// Este archivo corre con la exigencia de 2FA activada. Se fija antes de importar la app porque
// ConfigModule lee el entorno al cargarse (cada archivo de test tiene su propio grafo de modulos).
process.env.REQUIRE_STAFF_2FA = 'true';
const { createTestApp } = await import('./utils/test-app.js');

describe('clinica que exige verificacion en dos pasos al personal', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
  });

  it('el dueno sin 2FA no opera la administracion y /api/me se lo indica', async () => {
    const { owner } = await t.createClinic();

    const me = await owner.get('/api/me').expect(200);
    expect(me.body.twoFactorRequired).toBe(true);

    const res = await owner.get('/api/clinic/practitioners').expect(403);
    expect(res.body.message).toMatch(/dos pasos/);
  });

  it('con 2FA activada, el mismo dueno si opera', async () => {
    const { owner } = await t.createClinic('duena-2fa@example.com');
    await t.db
      .update(user)
      .set({ twoFactorEnabled: true })
      .where(eq(user.email, 'duena-2fa@example.com'));

    await owner.get('/api/clinic/practitioners').expect(200);
    expect((await owner.get('/api/me')).body.twoFactorRequired).toBe(false);
  });

  it('a un paciente no se le exige 2FA', async () => {
    const patient = await t.signUp('Paciente', 'paciente@example.com');
    const me = await patient.get('/api/me').expect(200);
    expect(me.body.twoFactorRequired).toBe(false);
  });
});
