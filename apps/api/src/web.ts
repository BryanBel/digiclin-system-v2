import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { INestApplication } from '@nestjs/common';
import express, { type NextFunction, type Request, type Response } from 'express';
import { API_PREFIX } from './app.setup.js';

type AstroHandler = (req: Request, res: Response, next: NextFunction) => void;

const isApiRequest = (req: Request) =>
  req.path === `/${API_PREFIX}` || req.path.startsWith(`/${API_PREFIX}/`);

/**
 * Produccion: la API sirve tambien la web compilada de apps/web (adapter de Astro en modo
 * middleware). Un solo proceso y un solo origen: cookie SameSite=Lax, sin CORS.
 * Se registra antes que las rutas de Nest y deja pasar todo lo que empiece por /api.
 */
export async function mountWeb(app: INestApplication) {
  const webDist = path.resolve(import.meta.dirname, '../../web/dist');
  const entry = pathToFileURL(path.join(webDist, 'server', 'entry.mjs')).href;
  const { handler } = (await import(entry)) as { handler: AstroHandler };

  app.use(express.static(path.join(webDist, 'client'), { index: false }));
  app.use((req: Request, res: Response, next: NextFunction) =>
    isApiRequest(req) ? next() : handler(req, res, next),
  );
}
