import { Logger } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { haveIBeenPwned, organization, twoFactor } from 'better-auth/plugins';
import { and, asc, eq } from 'drizzle-orm';
import type { Env } from '../config/env.js';
import type { Database } from '../db/database.module.js';
import * as schema from '../db/schema/index.js';
import type { Mailer, MailMessage } from '../mail/mailer.js';
import { mailTemplates } from '../mail/templates.js';
import { ac, clinicRoles } from './access-control.js';

export type AuthConfig = Pick<
  Env,
  'NODE_ENV' | 'PUBLIC_URL' | 'BETTER_AUTH_SECRET' | 'CLIENT_IP_HEADER'
>;

export interface AuthDeps {
  db: Database;
  config: AuthConfig;
  mailer: Mailer;
}

const HOUR = 60 * 60;

export function createAuth({ db, config, mailer }: AuthDeps) {
  const logger = new Logger('Auth');
  const isTest = config.NODE_ENV === 'test';

  /**
   * No se espera el envio: responder igual de rapido exista o no la cuenta evita revelar que
   * correos estan registrados (recomendacion de Better Auth para estos callbacks).
   */
  const sendInBackground = (message: MailMessage) => {
    void mailer
      .send(message)
      .catch((error: Error) =>
        logger.error(
          `No se pudo enviar "${message.subject}" a ${message.to.email}: ${error.message}`,
        ),
      );
  };

  const memberRole = async (userId: string, organizationId: string) => {
    const [row] = await db
      .select({ role: schema.member.role })
      .from(schema.member)
      .where(
        and(eq(schema.member.userId, userId), eq(schema.member.organizationId, organizationId)),
      )
      .limit(1);
    return row?.role ?? null;
  };

  return betterAuth({
    appName: 'DigiClin',
    baseURL: config.PUBLIC_URL,
    basePath: '/api/auth',
    secret: config.BETTER_AUTH_SECRET,
    trustedOrigins: [config.PUBLIC_URL],
    telemetry: { enabled: false },
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    advanced: {
      cookiePrefix: 'digiclin',
      database: { generateId: 'uuid' },
      ...(config.CLIENT_IP_HEADER && {
        ipAddress: { ipAddressHeaders: [config.CLIENT_IP_HEADER] },
      }),
    },
    rateLimit: { enabled: !isTest, storage: 'memory' },
    session: {
      // Turno largo de trabajo; se extiende mientras haya actividad.
      expiresIn: 12 * HOUR,
      updateAge: HOUR,
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      // Sin reglas de composicion; longitud y lista de contrasenas filtradas (NIST SP 800-63B).
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: HOUR,
      sendResetPassword: async ({ user, url }) =>
        sendInBackground(mailTemplates.resetPassword({ email: user.email, name: user.name }, url)),
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 24 * HOUR,
      sendVerificationEmail: async ({ user, url }) =>
        sendInBackground(mailTemplates.verifyEmail({ email: user.email, name: user.name }, url)),
    },
    databaseHooks: {
      session: {
        create: {
          // Toda sesion arranca en la clinica del usuario (MVP de una clinica por persona).
          before: async (session) => {
            const [membership] = await db
              .select({ organizationId: schema.member.organizationId })
              .from(schema.member)
              .where(eq(schema.member.userId, session.userId))
              .orderBy(asc(schema.member.createdAt))
              .limit(1);
            return {
              data: { ...session, activeOrganizationId: membership?.organizationId ?? null },
            };
          },
        },
      },
    },
    plugins: [
      organization({
        ac,
        roles: clinicRoles,
        creatorRole: 'owner',
        allowUserToCreateOrganization: false,
        invitationExpiresIn: 7 * 24 * HOUR,
        cancelPendingInvitationsOnReInvite: true,
        requireEmailVerificationOnInvitation: true,
        sendInvitationEmail: async ({ id, email, role, organization: clinic, inviter }) =>
          sendInBackground(
            mailTemplates.invitation(
              { email },
              {
                clinicName: clinic.name,
                inviterName: inviter.user.name,
                role,
                url: `${config.PUBLIC_URL}/invitacion/${id}`,
              },
            ),
          ),
        organizationHooks: {
          // Gobierno de la clinica: nadie entra como dueno por invitacion y solo el dueno
          // invita socios. Los socios invitan medicos.
          beforeCreateInvitation: async ({ invitation, inviter, organization: clinic }) => {
            if (invitation.role !== 'admin' && invitation.role !== 'doctor') {
              throw new APIError('FORBIDDEN', {
                message: 'Solo se puede invitar como socio o como médico.',
              });
            }
            if (
              invitation.role === 'admin' &&
              (await memberRole(inviter.id, clinic.id)) !== 'owner'
            ) {
              throw new APIError('FORBIDDEN', { message: 'Solo el dueño puede invitar socios.' });
            }
          },
          beforeUpdateMemberRole: async ({ newRole }) => {
            if (newRole === 'owner') {
              throw new APIError('FORBIDDEN', {
                message: 'La titularidad de la clínica no se asigna cambiando un rol.',
              });
            }
          },
          // Un medico invitado por la clinica queda aprobado: la clinica responde por el.
          afterAcceptInvitation: async ({ invitation, user, organization: clinic }) => {
            if (invitation.role !== 'doctor') return;
            const now = new Date();
            await db
              .insert(schema.practitionerProfiles)
              .values({
                userId: user.id,
                clinicId: clinic.id,
                status: 'approved',
                reviewedBy: invitation.inviterId,
                reviewedAt: now,
                reviewNote: 'Invitado por la clínica',
              })
              .onConflictDoUpdate({
                target: schema.practitionerProfiles.userId,
                set: {
                  clinicId: clinic.id,
                  status: 'approved',
                  reviewedBy: invitation.inviterId,
                  reviewedAt: now,
                  reviewNote: 'Invitado por la clínica',
                },
              });
          },
        },
      }),
      twoFactor({ issuer: 'DigiClin' }),
      haveIBeenPwned({
        enabled: !isTest,
        customPasswordCompromisedMessage:
          'Esta contraseña aparece en filtraciones conocidas. Elige otra.',
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = NonNullable<Awaited<ReturnType<Auth['api']['getSession']>>>;
