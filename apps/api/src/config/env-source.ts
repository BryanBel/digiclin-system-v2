import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

/**
 * Variables definidas en .env que el shell tapa con otro valor. La convencion (y
 * @nestjs/config) da prioridad al entorno del proceso, lo correcto en despliegues, pero en
 * local una variable olvidada en la terminal puede apuntar la API a otra base sin avisar.
 */
export function shadowedEnvKeys(envFile: string, env: NodeJS.ProcessEnv = process.env): string[] {
  if (!existsSync(envFile)) return [];
  const fromFile = parseEnv(readFileSync(envFile, 'utf8'));
  return Object.entries(fromFile)
    .filter(([key, value]) => env[key] !== undefined && env[key] !== value)
    .map(([key]) => key);
}

/** Host y base de una URL de Postgres, sin usuario ni contrasena, para mostrar en logs. */
export function describeDatabaseUrl(url: string): string {
  const { hostname, pathname } = new URL(url);
  return `${hostname}${pathname}`;
}
