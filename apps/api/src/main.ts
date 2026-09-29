import 'reflect-metadata';
import path from 'node:path';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { buildOpenApiDocument, configureApp } from './app.setup.js';
import type { Env } from './config/env.js';
import { describeDatabaseUrl, shadowedEnvKeys } from './config/env-source.js';
import { mountWeb } from './web.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const logger = new Logger('Bootstrap');

  logger.log(`Base de datos: ${describeDatabaseUrl(config.get('DATABASE_URL', { infer: true }))}`);

  const shadowed = shadowedEnvKeys(path.resolve(process.cwd(), '.env'));
  if (shadowed.length > 0) {
    logger.warn(
      `Estas variables vienen de la terminal y tapan las de .env: ${shadowed.join(', ')}. ` +
        `Si no es intencional, quitalas (PowerShell: Remove-Item Env:NOMBRE) y reinicia.`,
    );
  }

  configureApp(app);

  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    SwaggerModule.setup('api/docs', app, () => buildOpenApiDocument(app));
  }

  if (config.get('SERVE_WEB', { infer: true })) {
    await mountWeb(app);
  }

  await app.listen(config.get('PORT', { infer: true }));
}

await bootstrap();
