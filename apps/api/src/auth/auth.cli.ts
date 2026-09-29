import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization, twoFactor } from 'better-auth/plugins';
import { ac, clinicRoles } from './access-control.js';

/**
 * Configuracion minima SOLO para el CLI de Better Auth (`pnpm auth:schema`), que genera
 * src/db/schema/auth.ts. Debe tener los mismos plugins con tablas y la misma estrategia de ids
 * que auth.factory.ts. Si difieren, la validacion de esquema de Better Auth falla al arrancar.
 */
export const auth = betterAuth({
  database: drizzleAdapter({}, { provider: 'pg' }),
  advanced: { database: { generateId: 'uuid' } },
  plugins: [organization({ ac, roles: clinicRoles }), twoFactor()],
});
