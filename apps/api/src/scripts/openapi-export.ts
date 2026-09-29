import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Escribe apps/api/openapi.json, el contrato que la web convierte en tipos
 * (pnpm openapi). Se versiona: si la API cambia y el archivo no, la CI lo detecta.
 * No necesita base de datos: el pool de pg no conecta hasta la primera consulta.
 */
process.env.DATABASE_URL ??= 'postgres://openapi-export@localhost/unused';

const { NestFactory } = await import('@nestjs/core');
const { AppModule } = await import('../app.module.js');
const { buildOpenApiDocument, configureApp } = await import('../app.setup.js');

const app = await NestFactory.create(AppModule, { logger: false });
configureApp(app);
const document = buildOpenApiDocument(app);
await app.close();

const target = path.resolve(import.meta.dirname, '../../openapi.json');
writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);
console.log(`OpenAPI escrito en ${target}`);
