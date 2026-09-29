import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ClinicRole } from '@digiclin/shared';
import { fromNodeHeaders } from 'better-auth/node';
import { AccessPolicyService } from '../access/access-policy.service.js';
import type { Auth } from './auth.factory.js';
import { AUTH } from './auth.module.js';
import { type AuthenticatedRequest, CLINIC_ROLES, IS_PUBLIC } from './decorators.js';

/**
 * Guard global. Todo endpoint exige sesion salvo los marcados @Public: en un sistema de salud
 * un endpoint nuevo nace cerrado, no abierto.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(AUTH) private readonly auth: Auth,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const session = await this.auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) throw new UnauthorizedException('Inicia sesión para continuar.');

    request.auth = session;
    return true;
  }
}

/** Guard global para @ClinicRoles: rol en la clinica activa y, si se exige, 2FA del personal. */
@Injectable()
export class ClinicRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: AccessPolicyService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<ClinicRole[] | undefined>(CLINIC_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { user, session } = request.auth!;

    const clinicId = await this.access.resolveClinicId(user.id, session.activeOrganizationId);
    const roles = clinicId ? await this.access.clinicRoles(user.id, clinicId) : [];

    if (!clinicId || !roles.some((role) => required.includes(role))) {
      throw new ForbiddenException('No tienes permiso para esta acción en la clínica.');
    }
    if (this.access.needsTwoFactor(user, roles)) {
      throw new ForbiddenException(
        'La clínica exige verificación en dos pasos. Actívala en tu perfil para continuar.',
      );
    }

    request.clinic = { id: clinicId, roles };
    return true;
  }
}
