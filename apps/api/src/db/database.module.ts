import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import type { Env } from '../config/env.js';
import * as schema from './schema/index.js';

export const PG_POOL = Symbol('PG_POOL');
export const DB = Symbol('DB');

/**
 * Tipo base comun a node-postgres (produccion) y PGlite (tests), para que los servicios no
 * dependan del driver concreto.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      // El pool no abre conexiones hasta la primera consulta.
      useFactory: (config: ConfigService<Env, true>) =>
        new pg.Pool({ connectionString: config.get('DATABASE_URL', { infer: true }) }),
    },
    {
      provide: DB,
      inject: [PG_POOL],
      useFactory: (pool: pg.Pool): Database =>
        drizzle({ client: pool, schema, casing: 'snake_case' }),
    },
  ],
  exports: [DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
