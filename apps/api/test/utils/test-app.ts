import { existsSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { DB, type Database } from '../../src/db/database.module.js';
import * as schema from '../../src/db/schema/index.js';

const MIGRATIONS = path.resolve(import.meta.dirname, '../../drizzle');

/** Postgres real en memoria (PGlite) con todas las migraciones aplicadas. Sin Docker ni Neon. */
export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle({ client, schema, casing: 'snake_case' });
  if (existsSync(path.join(MIGRATIONS, 'meta', '_journal.json'))) {
    await migrate(db, { migrationsFolder: MIGRATIONS });
  }
  return { client, db: db as unknown as Database };
}

/** La app completa, con la BD sustituida por PGlite. */
export async function createTestApp(): Promise<{
  app: INestApplication;
  client: PGlite;
  db: Database;
  close: () => Promise<void>;
}> {
  const { client, db } = await createTestDb();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DB)
    .useValue(db)
    .compile();

  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();

  return {
    app,
    client,
    db,
    close: async () => {
      await app.close();
      if (!client.closed) await client.close();
    },
  };
}
