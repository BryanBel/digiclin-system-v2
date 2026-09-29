import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AccessPolicyService } from './access/access-policy.service.js';
import { AuthModule } from './auth/auth.module.js';
import { ClinicRoleGuard, SessionGuard } from './auth/guards.js';
import { type Env, validateEnv } from './config/env.js';
import { DatabaseModule } from './db/database.module.js';
import { HealthController } from './health/health.controller.js';
import { MailModule } from './mail/mail.module.js';
import { MeController } from './me/me.controller.js';
import {
  ClinicPractitionersController,
  PractitionersController,
} from './practitioners/practitioners.controller.js';
import { PractitionersService } from './practitioners/practitioners.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    // Limite general por IP para la API propia; /api/auth tiene el suyo en Better Auth.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const ipHeader = config.get('CLIENT_IP_HEADER', { infer: true });
        return {
          throttlers: [{ ttl: 60_000, limit: 120 }],
          skipIf: () => config.get('NODE_ENV', { infer: true }) === 'test',
          // Misma fuente de IP que Better Auth; sin cabecera, la IP de la conexion.
          getTracker: (req: Record<string, any>) => {
            const fromHeader = ipHeader ? req.headers?.[ipHeader] : undefined;
            return typeof fromHeader === 'string' && fromHeader ? fromHeader : String(req.ip);
          },
        };
      },
    }),
    DatabaseModule,
    MailModule,
    AuthModule,
  ],
  controllers: [
    HealthController,
    MeController,
    PractitionersController,
    ClinicPractitionersController,
  ],
  providers: [
    AccessPolicyService,
    PractitionersService,
    // Orden de ejecucion: limite de peticiones -> sesion -> rol en la clinica.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: ClinicRoleGuard },
  ],
})
export class AppModule {}
