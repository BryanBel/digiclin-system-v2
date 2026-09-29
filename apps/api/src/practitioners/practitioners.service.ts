import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  PractitionerApplication,
  PractitionerApplicationBody,
  PractitionerProfile,
  PractitionerStatus,
} from '@digiclin/shared';
import { practitionerApplicationBody } from '@digiclin/shared';
import { and, asc, desc, eq } from 'drizzle-orm';
import { parseRoles } from '../access/access-policy.service.js';
import type { Env } from '../config/env.js';
import { DB, type Database } from '../db/database.module.js';
import { member, organization, practitionerProfiles, user } from '../db/schema/index.js';
import { MAILER, type Mailer } from '../mail/mailer.js';
import { mailTemplates } from '../mail/templates.js';

type ProfileRow = typeof practitionerProfiles.$inferSelect;

function toProfile(row: ProfileRow): PractitionerProfile {
  return {
    userId: row.userId,
    clinicId: row.clinicId,
    status: row.status,
    specialties: row.specialties,
    qualifications: row.qualifications,
    reviewNote: row.reviewNote,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class PractitionersService {
  private readonly logger = new Logger(PractitionersService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(MAILER) private readonly mailer: Mailer,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async findOwn(userId: string): Promise<PractitionerProfile | null> {
    const [row] = await this.db
      .select()
      .from(practitionerProfiles)
      .where(eq(practitionerProfiles.userId, userId))
      .limit(1);
    return row ? toProfile(row) : null;
  }

  /**
   * Crea o reenvia la solicitud. Un medico aprobado o suspendido no la reescribe: sus datos
   * ya fueron verificados por la clinica y cambiarlos pasa por ella.
   */
  async submitApplication(
    userId: string,
    clinicId: string | null,
    input: PractitionerApplicationBody,
  ): Promise<PractitionerProfile> {
    const body = practitionerApplicationBody.parse(input);
    const targetClinicId = clinicId ?? (await this.defaultClinicId());
    if (!targetClinicId) {
      throw new ConflictException('La clínica aún no está configurada. Intenta más tarde.');
    }

    const existing = await this.findOwn(userId);
    if (existing && (existing.status === 'approved' || existing.status === 'suspended')) {
      throw new ConflictException(
        'Tus datos profesionales ya fueron revisados por la clínica. Para cambiarlos, contáctala.',
      );
    }

    const values = {
      clinicId: targetClinicId,
      status: 'pending' as const,
      specialties: body.specialties,
      qualifications: body.qualifications,
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
    };
    const [row] = await this.db
      .insert(practitionerProfiles)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: practitionerProfiles.userId, set: values })
      .returning();
    return toProfile(row!);
  }

  async listForClinic(
    clinicId: string,
    status?: PractitionerStatus,
  ): Promise<PractitionerApplication[]> {
    const rows = await this.db
      .select({ profile: practitionerProfiles, name: user.name, email: user.email })
      .from(practitionerProfiles)
      .innerJoin(user, eq(user.id, practitionerProfiles.userId))
      .where(
        and(
          eq(practitionerProfiles.clinicId, clinicId),
          status ? eq(practitionerProfiles.status, status) : undefined,
        ),
      )
      .orderBy(desc(practitionerProfiles.updatedAt));
    return rows.map(({ profile, name, email }) => ({ ...toProfile(profile), name, email }));
  }

  /** Aprueba y da de alta al medico como miembro de la clinica, en una sola transaccion. */
  async approve(clinicId: string, reviewerId: string, userId: string) {
    const applicant = await this.pendingApplicant(clinicId, userId);

    await this.db.transaction(async (tx) => {
      await tx
        .update(practitionerProfiles)
        .set({
          status: 'approved',
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          reviewNote: null,
        })
        .where(eq(practitionerProfiles.userId, userId));

      const [membership] = await tx
        .select({ id: member.id, role: member.role })
        .from(member)
        .where(and(eq(member.userId, userId), eq(member.organizationId, clinicId)))
        .limit(1);

      if (!membership) {
        await tx
          .insert(member)
          .values({ userId, organizationId: clinicId, role: 'doctor', createdAt: new Date() });
      } else if (!parseRoles(membership.role).includes('doctor')) {
        // p. ej. el dueno que tambien atiende: conserva su rol y suma el de medico.
        const roles = [...parseRoles(membership.role), 'doctor'];
        await tx
          .update(member)
          .set({ role: roles.join(',') })
          .where(eq(member.id, membership.id));
      }
    });

    this.notify(
      mailTemplates.practitionerApproved(
        { email: applicant.email, name: applicant.name },
        {
          clinicName: applicant.clinicName,
          url: `${this.config.get('PUBLIC_URL', { infer: true })}/medico`,
        },
      ),
    );
  }

  async reject(clinicId: string, reviewerId: string, userId: string, reason: string) {
    const applicant = await this.pendingApplicant(clinicId, userId);

    await this.db
      .update(practitionerProfiles)
      .set({
        status: 'rejected',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNote: reason,
      })
      .where(eq(practitionerProfiles.userId, userId));

    this.notify(
      mailTemplates.practitionerRejected(
        { email: applicant.email, name: applicant.name },
        { clinicName: applicant.clinicName, reason },
      ),
    );
  }

  private async pendingApplicant(clinicId: string, userId: string) {
    const [row] = await this.db
      .select({
        status: practitionerProfiles.status,
        name: user.name,
        email: user.email,
        clinicName: organization.name,
      })
      .from(practitionerProfiles)
      .innerJoin(user, eq(user.id, practitionerProfiles.userId))
      .innerJoin(organization, eq(organization.id, practitionerProfiles.clinicId))
      .where(
        and(eq(practitionerProfiles.userId, userId), eq(practitionerProfiles.clinicId, clinicId)),
      )
      .limit(1);

    // Otra clinica o inexistente: 404, sin revelar si existe en otra parte.
    if (!row) throw new NotFoundException('No hay una solicitud de ese médico en tu clínica.');
    if (row.status !== 'pending') {
      throw new ConflictException('Esta solicitud ya fue revisada.');
    }
    return row;
  }

  /** MVP de una clinica: las solicitudes sin clinica van a la primera creada. */
  private async defaultClinicId() {
    const [clinic] = await this.db
      .select({ id: organization.id })
      .from(organization)
      .orderBy(asc(organization.createdAt))
      .limit(1);
    return clinic?.id ?? null;
  }

  private notify(message: ReturnType<(typeof mailTemplates)['practitionerApproved']>) {
    void this.mailer
      .send(message)
      .catch((error: Error) =>
        this.logger.error(`No se pudo avisar a ${message.to.email}: ${error.message}`),
      );
  }
}
