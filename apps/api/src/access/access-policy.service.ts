import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { clinicRole, type ClinicRole, type MeResponse } from '@digiclin/shared';
import { and, asc, eq } from 'drizzle-orm';
import type { AuthSession } from '../auth/auth.factory.js';
import type { Env } from '../config/env.js';
import { DB, type Database } from '../db/database.module.js';
import { member, organization, practitionerProfiles } from '../db/schema/index.js';

const STAFF_ROLES: ClinicRole[] = ['owner', 'admin', 'doctor'];

/** Better Auth guarda varios roles como "owner,doctor"; se ignora lo que no sea un rol valido. */
export function parseRoles(value: string | null | undefined): ClinicRole[] {
  if (!value) return [];
  return value
    .split(',')
    .map((role) => role.trim())
    .filter((role): role is ClinicRole => clinicRole.safeParse(role).success);
}

/**
 * Punto unico de las reglas de acceso. En esta fase: pertenencia a la clinica y estado del
 * medico. En la fase 3 se suma la relacion de atencion para el contenido clinico.
 */
@Injectable()
export class AccessPolicyService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** La clinica activa de la sesion o, si no hay, la primera a la que pertenece. */
  async resolveClinicId(userId: string, activeOrganizationId?: string | null) {
    if (activeOrganizationId) return activeOrganizationId;
    const [first] = await this.db
      .select({ id: member.organizationId })
      .from(member)
      .where(eq(member.userId, userId))
      .orderBy(asc(member.createdAt))
      .limit(1);
    return first?.id ?? null;
  }

  async clinicRoles(userId: string, clinicId: string): Promise<ClinicRole[]> {
    const [row] = await this.db
      .select({ role: member.role })
      .from(member)
      .where(and(eq(member.userId, userId), eq(member.organizationId, clinicId)))
      .limit(1);
    return parseRoles(row?.role);
  }

  isStaff(roles: ClinicRole[]) {
    return roles.some((role) => STAFF_ROLES.includes(role));
  }

  /** Personal sin 2FA cuando la clinica la exige: no puede operar hasta activarla. */
  needsTwoFactor(user: AuthSession['user'], roles: ClinicRole[]) {
    return (
      this.config.get('REQUIRE_STAFF_2FA', { infer: true }) &&
      this.isStaff(roles) &&
      !user.twoFactorEnabled
    );
  }

  async me({ user, session }: AuthSession): Promise<MeResponse> {
    const clinicId = await this.resolveClinicId(user.id, session.activeOrganizationId);

    const [clinic] = clinicId
      ? await this.db
          .select({ id: organization.id, name: organization.name })
          .from(organization)
          .where(eq(organization.id, clinicId))
          .limit(1)
      : [];
    const roles = clinic ? await this.clinicRoles(user.id, clinic.id) : [];

    const [practitioner] = await this.db
      .select({ status: practitionerProfiles.status, clinicId: practitionerProfiles.clinicId })
      .from(practitionerProfiles)
      .where(eq(practitionerProfiles.userId, user.id))
      .limit(1);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        twoFactorEnabled: Boolean(user.twoFactorEnabled),
      },
      clinic: clinic ? { ...clinic, roles } : null,
      practitioner: practitioner ? { status: practitioner.status } : null,
      access: {
        admin: roles.includes('owner') || roles.includes('admin'),
        doctor:
          practitioner?.status === 'approved' &&
          practitioner.clinicId === clinic?.id &&
          roles.includes('doctor'),
        patient: true,
      },
      twoFactorRequired: this.needsTwoFactor(user, roles),
    };
  }
}
