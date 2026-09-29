import { Controller, Get, HttpCode, HttpStatus, Inject, Logger, Res } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { healthResponse, type HealthResponse } from '@digiclin/shared';
import { sql } from 'drizzle-orm';
import type { Response } from 'express';
import { toOpenApi } from '../common/zod.js';
import { DB, type Database } from '../db/database.module.js';
import { API_VERSION } from '../version.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Publico y sin secretos: solo dice si la API y la base responden. El motivo del fallo va
   * al log del servidor, nunca a la respuesta.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: toOpenApi(healthResponse) })
  @ApiServiceUnavailableResponse({ schema: toOpenApi(healthResponse) })
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    const database = await this.db
      .execute(sql`select 1`)
      .then(() => 'up' as const)
      .catch((error: unknown) => {
        const cause = (error as { cause?: { message?: string } }).cause?.message;
        this.logger.warn(`Base de datos sin respuesta: ${cause ?? (error as Error).message}`);
        return 'down' as const;
      });

    if (database === 'down') res.status(HttpStatus.SERVICE_UNAVAILABLE);

    return { status: database === 'up' ? 'ok' : 'degraded', database, version: API_VERSION };
  }
}
