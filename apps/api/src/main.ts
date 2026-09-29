import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { buildOpenApiDocument, configureApp } from './app.setup.js';
import type { Env } from './config/env.js';
import { mountWeb } from './web.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);

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
