import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.js';

const base = {
  DATABASE_URL: 'postgresql://u:p@host/db',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('aplica valores por defecto y convierte tipos', () => {
    expect(validateEnv({ ...base, SERVE_WEB: 'true' })).toEqual({
      ...base,
      NODE_ENV: 'development',
      PORT: 3000,
      SERVE_WEB: true,
      PUBLIC_URL: 'http://localhost:4321',
      REQUIRE_STAFF_2FA: false,
      MAIL_PROVIDER: 'console',
      MAIL_FROM_NAME: 'DigiClin',
    });
  });

  it('falla al arrancar si falta DATABASE_URL, nombrando la variable', () => {
    expect(() => validateEnv({ BETTER_AUTH_SECRET: base.BETTER_AUTH_SECRET })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('rechaza una URL que no es de Postgres', () => {
    expect(() => validateEnv({ ...base, DATABASE_URL: 'mysql://u:p@host/db' })).toThrow(/postgres/);
  });

  it('exige un secreto de al menos 32 caracteres', () => {
    expect(() => validateEnv({ ...base, BETTER_AUTH_SECRET: 'corto' })).toThrow(
      /BETTER_AUTH_SECRET/,
    );
  });

  it('con Brevo exige la clave y el remitente', () => {
    expect(() => validateEnv({ ...base, MAIL_PROVIDER: 'brevo' })).toThrow(
      /BREVO_API_KEY[\s\S]*MAIL_FROM/,
    );
  });

  it('en produccion no acepta el correo por consola', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'production' })).toThrow(/MAIL_PROVIDER/);
  });

  it('una variable opcional vacia (copiada tal cual del .env.example) cuenta como no definida', () => {
    const env = validateEnv({ ...base, CLIENT_IP_HEADER: '', BREVO_API_KEY: '', MAIL_FROM: '' });
    expect(env.CLIENT_IP_HEADER).toBeUndefined();
    expect(env.MAIL_FROM).toBeUndefined();
  });

  it('con Brevo, dejar la clave vacia sigue siendo un error', () => {
    expect(() =>
      validateEnv({ ...base, MAIL_PROVIDER: 'brevo', BREVO_API_KEY: '', MAIL_FROM: 'a@b.co' }),
    ).toThrow(/BREVO_API_KEY/);
  });
});
