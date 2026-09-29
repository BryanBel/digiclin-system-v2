import 'reflect-metadata';
import { parseArgs } from 'node:util';

/**
 * Crea la clinica y su dueno en la base de DATABASE_URL.
 *
 *   pnpm --filter @digiclin/api bootstrap:clinic \
 *     --clinic "Clínica Ejemplo" --slug clinica-ejemplo \
 *     --owner-name "Nombre Apellido" --owner-email dueno@example.com
 *
 * Con MAIL_PROVIDER=console el enlace para elegir contrasena sale en esta misma consola.
 */
// Si se escribe "--" antes de los argumentos, pnpm lo pasa literal: se descarta.
const argv = process.argv.slice(2);
const { values } = parseArgs({
  args: argv[0] === '--' ? argv.slice(1) : argv,
  options: {
    clinic: { type: 'string' },
    slug: { type: 'string' },
    'owner-name': { type: 'string' },
    'owner-email': { type: 'string' },
  },
});

const missing = ['clinic', 'slug', 'owner-name', 'owner-email'].filter(
  (key) => !values[key as keyof typeof values],
);
if (missing.length > 0) {
  console.error(`Faltan argumentos: ${missing.map((key) => `--${key}`).join(', ')}`);
  process.exit(1);
}
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(values.slug!)) {
  console.error('--slug solo admite minusculas, numeros y guiones (p. ej. clinica-ejemplo).');
  process.exit(1);
}

const { NestFactory } = await import('@nestjs/core');
const { ConfigService } = await import('@nestjs/config');
const { AppModule } = await import('../app.module.js');
const { AUTH } = await import('../auth/auth.module.js');
const { DB } = await import('../db/database.module.js');
const { describeDatabaseUrl } = await import('../config/env-source.js');
const { bootstrapClinic } = await import('../clinics/bootstrap.js');

const app = await NestFactory.createApplicationContext(AppModule, {
  logger: ['error', 'warn', 'log'],
});
try {
  const config = app.get(ConfigService);
  console.log(`Base de datos: ${describeDatabaseUrl(config.getOrThrow<string>('DATABASE_URL'))}`);

  const result = await bootstrapClinic(app.get(DB), app.get(AUTH), {
    clinicName: values.clinic!,
    slug: values.slug!,
    owner: { name: values['owner-name']!, email: values['owner-email']! },
    resetPasswordUrl: `${config.get('PUBLIC_URL')}/restablecer`,
  });

  console.log(`Clinica creada: ${result.clinic.name} (${result.clinic.id})`);
  console.log(
    result.ownerCreated
      ? `Dueno creado. Se envio a ${values['owner-email']} un enlace para elegir su contrasena.`
      : `La cuenta ${values['owner-email']} ya existia: ahora es duena de la clinica.`,
  );
  // Da tiempo a que salga el correo (se envia en segundo plano).
  await new Promise((resolve) => setTimeout(resolve, 1500));
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  await app.close();
}
