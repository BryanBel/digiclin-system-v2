import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp } from './utils/test-app.js';

describe('GET /api/health', () => {
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await close?.();
  });

  it('responde 200 cuando la base contesta', async () => {
    const testApp = await createTestApp();
    close = testApp.close;

    const res = await request(testApp.app.getHttpServer()).get('/api/health').expect(200);

    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('responde 503 cuando la base no contesta, sin exponer el error', async () => {
    const testApp = await createTestApp();
    close = testApp.close;
    await testApp.client.close();

    const res = await request(testApp.app.getHttpServer()).get('/api/health').expect(503);

    expect(res.body).toEqual({ status: 'degraded', database: 'down', version: expect.any(String) });
  });

  it('responde 404 con el formato de error comun en rutas inexistentes', async () => {
    const testApp = await createTestApp();
    close = testApp.close;

    const res = await request(testApp.app.getHttpServer()).get('/api/no-existe').expect(404);

    expect(res.body).toEqual({ statusCode: 404, message: expect.any(String) });
  });

  it('agrega cabeceras de seguridad (helmet) a la API', async () => {
    const testApp = await createTestApp();
    close = testApp.close;

    const res = await request(testApp.app.getHttpServer()).get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
