import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.js';

describe('validateEnv', () => {
  it('aplica valores por defecto y convierte tipos', () => {
    expect(validateEnv({ DATABASE_URL: 'postgresql://u:p@host/db', SERVE_WEB: 'true' })).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: 'postgresql://u:p@host/db',
      SERVE_WEB: true,
    });
  });

  it('falla al arrancar si falta DATABASE_URL, nombrando la variable', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rechaza una URL que no es de Postgres', () => {
    expect(() => validateEnv({ DATABASE_URL: 'mysql://u:p@host/db' })).toThrow(/postgres/);
  });
});
