import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { meResponse, type MeResponse } from '@digiclin/shared';
import { AccessPolicyService } from '../access/access-policy.service.js';
import type { AuthSession } from '../auth/auth.factory.js';
import { CurrentAuth } from '../auth/decorators.js';
import { toOpenApi } from '../common/zod.js';

@ApiTags('me')
@ApiCookieAuth()
@Controller('me')
export class MeController {
  constructor(private readonly access: AccessPolicyService) {}

  @Get()
  @ApiOkResponse({ schema: toOpenApi(meResponse) })
  me(@CurrentAuth() auth: AuthSession): Promise<MeResponse> {
    return this.access.me(auth);
  }
}
