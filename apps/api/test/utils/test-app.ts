import { existsSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import type { Auth } from '../../src/auth/auth.factory.js';
import { AUTH } from '../../src/auth/auth.module.js';
import { bootstrapClinic } from '../../src/clinics/bootstrap.js';
import { DB, type Database } from '../../src/db/database.module.js';
import * as schema from '../../src/db/schema/index.js';
import { MAILER, type Mailer, type MailMessage } from '../../src/mail/mailer.js';

const MIGRATIONS = path.resolve(import.meta.dirname, '../../drizzle');
export const ORIGIN = 'http://localhost:4321';
export const PASSWORD = 'contrasena-de-prueba-larga';

/** Postgres real en memoria (PGlite) con todas las migraciones aplicadas. Sin Docker ni Neon. */
export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle({ client, schema, casing: 'snake_case' });
  if (existsSync(path.join(MIGRATIONS, 'meta', '_journal.json'))) {
    await migrate(db, { migrationsFolder: MIGRATIONS });
  }
  return { client, db: db as unknown as Database };
}

/** Guarda los correos en memoria para que los tests sigan sus enlaces como lo haria una persona. */
export class RecordingMailer implements Mailer {
  readonly sent: MailMessage[] = [];

  async send(message: MailMessage) {
    this.sent.push(message);
  }

  /** Ultimo correo a esa direccion cuyo asunto coincide. */
  last(email: string, subject: RegExp) {
    const found = this.sent.findLast((m) => m.to.email === email && subject.test(m.subject));
    if (!found) throw new Error(`No hay correo "${subject}" para ${email}`);
    return found;
  }

  /** Primer enlace del texto plano del ultimo correo que coincide. */
  link(email: string, subject: RegExp) {
    const url = this.last(email, subject).text.match(/https?:\/\/\S+/)?.[0];
    if (!url) throw new Error(`El correo "${subject}" para ${email} no trae enlace`);
    return new URL(url);
  }
}

/** La app completa, con la BD sustituida por PGlite y el correo por RecordingMailer. */
export async function createTestApp() {
  const { client, db } = await createTestDb();
  const mailer = new RecordingMailer();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DB)
    .useValue(db)
    .overrideProvider(MAILER)
    .useValue(mailer)
    .compile();

  const app: INestApplication = moduleRef.createNestApplication({
    logger: false,
    bodyParser: false,
  });
  configureApp(app);
  await app.init();

  const auth = app.get<Auth>(AUTH);
  const server = app.getHttpServer();

  /** Un navegador: guarda cookies y manda el Origin de la web, como el real. */
  const browser = () => {
    const agent = request.agent(server);
    return {
      agent,
      get: (url: string) => agent.get(url).set('Origin', ORIGIN),
      post: (url: string, body?: object) =>
        agent
          .post(url)
          .set('Origin', ORIGIN)
          .send(body ?? {}),
      put: (url: string, body?: object) =>
        agent
          .put(url)
          .set('Origin', ORIGIN)
          .send(body ?? {}),
    };
  };
  type Browser = ReturnType<typeof browser>;

  /** Sigue un enlace de correo (verificacion) con el navegador dado. */
  const follow = (as: Browser, url: URL) => as.agent.get(url.pathname + url.search).redirects(0);

  /** Registro + verificacion por correo: devuelve un navegador con sesion iniciada. */
  const signUp = async (name: string, email: string) => {
    const as = browser();
    const res = await as.post('/api/auth/sign-up/email', { name, email, password: PASSWORD });
    if (res.status !== 200) throw new Error(`Registro fallo (${res.status}): ${res.text}`);
    await follow(as, mailer.link(email, /Confirma tu correo/));
    return as;
  };

  const signIn = async (email: string) => {
    const as = browser();
    const res = await as.post('/api/auth/sign-in/email', { email, password: PASSWORD });
    if (res.status !== 200) throw new Error(`Ingreso fallo (${res.status}): ${res.text}`);
    return as;
  };

  /** Clinica + dueno con contrasena elegida desde el enlace del correo, ya con sesion. */
  const createClinic = async (ownerEmail = 'duena@example.com') => {
    const { clinic } = await bootstrapClinic(db, auth, {
      clinicName: 'Clínica de Prueba',
      slug: `clinica-${crypto.randomUUID().slice(0, 8)}`,
      owner: { name: 'Dueña Prueba', email: ownerEmail },
      resetPasswordUrl: `${ORIGIN}/restablecer`,
    });
    const token = await resetTokenFrom(mailer.link(ownerEmail, /Restablece tu contraseña/));
    const res = await browser().post('/api/auth/reset-password', { newPassword: PASSWORD, token });
    if (res.status !== 200) throw new Error(`Restablecer fallo (${res.status}): ${res.text}`);
    return { clinic, owner: await signIn(ownerEmail) };
  };

  /** El enlace de restablecer redirige a la web con ?token=...; se extrae como la web lo haria. */
  const resetTokenFrom = async (url: URL) => {
    const res = await request(server)
      .get(url.pathname + url.search)
      .redirects(0);
    const token = new URL(res.headers.location!, ORIGIN).searchParams.get('token');
    if (!token) throw new Error(`El enlace de restablecer no dio token: ${res.headers.location}`);
    return token;
  };

  return {
    app,
    server,
    client,
    db,
    auth,
    mailer,
    browser,
    follow,
    signUp,
    signIn,
    createClinic,
    close: async () => {
      await app.close();
      if (!client.closed) await client.close();
    },
  };
}

export type TestApp = Awaited<ReturnType<typeof createTestApp>>;
