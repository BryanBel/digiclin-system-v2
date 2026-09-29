import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { BrevoMailer, ConsoleMailer, MAILER, type Mailer } from './mailer.js';

@Global()
@Module({
  providers: [
    {
      provide: MAILER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): Mailer => {
        if (config.get('MAIL_PROVIDER', { infer: true }) === 'brevo') {
          return new BrevoMailer(config.get('BREVO_API_KEY', { infer: true })!, {
            email: config.get('MAIL_FROM', { infer: true })!,
            name: config.get('MAIL_FROM_NAME', { infer: true }),
          });
        }
        return new ConsoleMailer();
      },
    },
  ],
  exports: [MAILER],
})
export class MailModule {}
