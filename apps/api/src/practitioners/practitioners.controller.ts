import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  practitionerApplication,
  practitionerApplicationBody,
  type PractitionerApplicationBody,
  practitionerProfile,
  practitionerStatus,
  type PractitionerStatus,
  rejectPractitionerBody,
} from '@digiclin/shared';
import { z } from 'zod';
import type { AuthSession } from '../auth/auth.factory.js';
import { type ClinicContext, ClinicRoles, CurrentAuth, CurrentClinic } from '../auth/decorators.js';
import { toOpenApi, ZodValidationPipe } from '../common/zod.js';
import { PractitionersService } from './practitioners.service.js';

@ApiTags('practitioners')
@ApiCookieAuth()
@Controller('practitioners')
export class PractitionersController {
  constructor(private readonly practitioners: PractitionersService) {}

  @Get('me')
  @ApiOkResponse({ schema: toOpenApi(practitionerProfile) })
  async getOwn(@CurrentAuth() { user }: AuthSession) {
    const profile = await this.practitioners.findOwn(user.id);
    if (!profile) throw new NotFoundException('Aún no enviaste tus datos profesionales.');
    return profile;
  }

  /** Solicitud para atender en la clinica. Queda pendiente hasta que la administracion la revise. */
  @Put('me/application')
  @ApiBody({ schema: toOpenApi(practitionerApplicationBody, 'input') })
  @ApiOkResponse({ schema: toOpenApi(practitionerProfile) })
  submit(
    @CurrentAuth() { user, session }: AuthSession,
    @Body(new ZodValidationPipe(practitionerApplicationBody)) body: PractitionerApplicationBody,
  ) {
    return this.practitioners.submitApplication(
      user.id,
      session.activeOrganizationId ?? null,
      body,
    );
  }
}

const listQuery = z.object({ status: practitionerStatus.optional() });

@ApiTags('clinic')
@ApiCookieAuth()
@ClinicRoles('owner', 'admin')
@Controller('clinic/practitioners')
export class ClinicPractitionersController {
  constructor(private readonly practitioners: PractitionersService) {}

  @Get()
  @ApiQuery({ name: 'status', required: false, enum: practitionerStatus.options })
  @ApiOkResponse({ schema: toOpenApi(z.array(practitionerApplication)) })
  list(
    @CurrentClinic() clinic: ClinicContext,
    @Query(new ZodValidationPipe(listQuery)) query: { status?: PractitionerStatus },
  ) {
    return this.practitioners.listForClinic(clinic.id, query.status);
  }

  @Post(':userId/approve')
  @HttpCode(HttpStatus.NO_CONTENT)
  approve(
    @CurrentClinic() clinic: ClinicContext,
    @CurrentAuth() { user }: AuthSession,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.practitioners.approve(clinic.id, user.id, userId);
  }

  @Post(':userId/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBody({ schema: toOpenApi(rejectPractitionerBody, 'input') })
  reject(
    @CurrentClinic() clinic: ClinicContext,
    @CurrentAuth() { user }: AuthSession,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body(new ZodValidationPipe(rejectPractitionerBody)) body: { reason: string },
  ) {
    return this.practitioners.reject(clinic.id, user.id, userId, body.reason);
  }
}
