import type { INestApplication } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import express, { type Express } from 'express';
import type { Auth } from './auth.factory.js';
import { AUTH } from './auth.module.js';

/**
 * Better Auth atiende /api/auth/* con su propio handler, que necesita el cuerpo sin parsear:
 * por eso la app se crea con `bodyParser: false` y el parser JSON se registra despues, solo
 * para el resto de /api (la web de Astro tampoco debe recibir el cuerpo consumido).
 */
export function mountAuth(app: INestApplication, apiPrefix: string) {
  const auth = app.get<Auth>(AUTH);
  const server = app.getHttpAdapter().getInstance() as Express;

  server.all(`/${apiPrefix}/auth/{*path}`, toNodeHandler(auth));
  app.use(`/${apiPrefix}`, express.json({ limit: '1mb' }));
}
