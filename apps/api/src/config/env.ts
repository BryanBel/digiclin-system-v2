import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

/** Variable opcional: vacia en el .env ("CLAVE=") cuenta como no definida. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.url({
      protocol: /^postgres(ql)?$/,
      error: 'DATABASE_URL debe ser una URL postgres://',
    }),
    SERVE_WEB: booleanFromString,

    /** Origen que ve el usuario (web + API). Base de los enlaces de los correos. */
    PUBLIC_URL: z.url().default('http://localhost:4321'),
    /** Firma de sesiones y tokens de Better Auth. */
    BETTER_AUTH_SECRET: z
      .string()
      .min(32, 'BETTER_AUTH_SECRET debe tener al menos 32 caracteres aleatorios'),
    /** true = el personal (duenos, socios, medicos) no opera sin verificacion en dos pasos. */
    REQUIRE_STAFF_2FA: booleanFromString,
    /**
     * Cabecera con la IP real del cliente que pone el proxy del hosting. Sin ella, los limites
     * de intentos no distinguen clientes. Verificar la de Render antes del lanzamiento.
     */
    CLIENT_IP_HEADER: optional(z.string().trim().toLowerCase().min(1)),

    MAIL_PROVIDER: z.enum(['console', 'brevo']).default('console'),
    BREVO_API_KEY: optional(z.string().min(1)),
    MAIL_FROM: optional(z.email()),
    MAIL_FROM_NAME: z.string().min(1).default('DigiClin'),
  })
  .superRefine((env, ctx) => {
    if (env.MAIL_PROVIDER === 'brevo') {
      for (const key of ['BREVO_API_KEY', 'MAIL_FROM'] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `es obligatoria con MAIL_PROVIDER=brevo`,
          });
        }
      }
    }
    if (env.NODE_ENV === 'production' && env.MAIL_PROVIDER === 'console') {
      ctx.addIssue({
        code: 'custom',
        path: ['MAIL_PROVIDER'],
        message: 'en produccion los correos deben enviarse de verdad (usa brevo)',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Valida el entorno al arrancar: si falta algo, la API no inicia (falla rapido y claro). */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Variables de entorno invalidas:\n${problems}`);
  }
  return result.data;
}
