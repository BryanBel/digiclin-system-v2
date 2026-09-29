import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { DB, type Database } from '../db/database.module.js';
import { MAILER, type Mailer } from '../mail/mailer.js';
import { createAuth } from './auth.factory.js';

export const AUTH = Symbol('AUTH');

@Global()
@Module({
  providers: [
    {
      provide: AUTH,
      inject: [DB, ConfigService, MAILER],
      useFactory: (db: Database, config: ConfigService<Env, true>, mailer: Mailer) =>
        createAuth({
          db,
          mailer,
          config: {
            NODE_ENV: config.get('NODE_ENV', { infer: true }),
            PUBLIC_URL: config.get('PUBLIC_URL', { infer: true }),
            BETTER_AUTH_SECRET: config.get('BETTER_AUTH_SECRET', { infer: true }),
            CLIENT_IP_HEADER: config.get('CLIENT_IP_HEADER', { infer: true }),
          },
        }),
    },
  ],
  exports: [AUTH],
})
export class AuthModule {}
