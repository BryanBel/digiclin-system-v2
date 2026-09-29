import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import type { ClinicRole } from '@digiclin/shared';
import type { Request } from 'express';
import type { AuthSession } from './auth.factory.js';

export interface ClinicContext {
  id: string;
  roles: ClinicRole[];
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthSession;
  clinic?: ClinicContext;
}

export const IS_PUBLIC = 'digiclin:isPublic';
export const CLINIC_ROLES = 'digiclin:clinicRoles';

/** El endpoint no exige sesion. Por defecto todo la exige (deny by default). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Exige ser miembro de la clinica activa con alguno de estos roles. */
export const ClinicRoles = (...roles: ClinicRole[]) => SetMetadata(CLINIC_ROLES, roles);

/** Sesion actual ({ user, session }); solo en endpoints no publicos. */
export const CurrentAuth = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthSession => {
    const auth = ctx.switchToHttp().getRequest<AuthenticatedRequest>().auth;
    if (!auth) throw new UnauthorizedException('Inicia sesión para continuar.');
    return auth;
  },
);

/** Clinica activa verificada por ClinicRoleGuard; solo junto a @ClinicRoles. */
export const CurrentClinic = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const clinic = ctx.switchToHttp().getRequest<AuthenticatedRequest>().clinic;
  if (!clinic) throw new Error('@CurrentClinic requiere @ClinicRoles en el endpoint.');
  return clinic;
});
