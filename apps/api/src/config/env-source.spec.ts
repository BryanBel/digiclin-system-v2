import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { describeDatabaseUrl, shadowedEnvKeys } from './env-source.js';

function envFile(contents: string) {
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'digiclin-env-')), '.env');
  writeFileSync(file, contents);
  return file;
}

describe('shadowedEnvKeys', () => {
  const file = envFile('DATABASE_URL=postgres://dev-host/digiclin\nPORT=3000\n');

  it('detecta una variable del shell que tapa la del .env con otro valor', () => {
    const env = { DATABASE_URL: 'postgres://prod-host/neondb', PORT: '3000' };
    expect(shadowedEnvKeys(file, env)).toEqual(['DATABASE_URL']);
  });

  it('no avisa cuando el valor del shell coincide con el del .env', () => {
    expect(shadowedEnvKeys(file, { DATABASE_URL: 'postgres://dev-host/digiclin' })).toEqual([]);
  });

  it('no hace nada si no existe .env (produccion)', () => {
    expect(shadowedEnvKeys(path.join(tmpdir(), 'no-existe', '.env'), {})).toEqual([]);
  });
});

describe('describeDatabaseUrl', () => {
  it('muestra host y base sin credenciales', () => {
    expect(
      describeDatabaseUrl('postgresql://user:secreto@ep-x.neon.tech/digiclin?sslmode=verify-full'),
    ).toBe('ep-x.neon.tech/digiclin');
  });
});
