import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

export interface ErrorBody {
  statusCode: number;
  message: string;
  details?: unknown;
}

/** Codigos de error de PostgreSQL que son culpa del cliente, no del servidor. */
const PG_ERRORS: Record<string, { status: number; message: string }> = {
  '23505': { status: HttpStatus.CONFLICT, message: 'Ya existe un registro con esos datos.' },
  '23503': {
    status: HttpStatus.CONFLICT,
    message: 'El registro hace referencia a datos que no existen.',
  },
  '22P02': { status: HttpStatus.BAD_REQUEST, message: 'Formato de dato no valido.' },
};

/** Drizzle envuelve el error de pg en `cause`; se busca el codigo en ambos niveles. */
function pgErrorCode(exception: unknown): string | undefined {
  for (const candidate of [exception, (exception as { cause?: unknown })?.cause]) {
    const code = (candidate as { code?: unknown } | undefined)?.code;
    if (typeof code === 'string' && code in PG_ERRORS) return code;
  }
  return undefined;
}

/**
 * Respuesta de error unica para toda la API: { statusCode, message, details? }.
 * Nunca incluye la traza ni el cuerpo de la peticion: en un sistema de salud el cuerpo puede
 * llevar datos clinicos, asi que tampoco se registra en el log.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const body = this.toBody(exception);
    // baseUrl + path conserva el prefijo /api sin el query string (puede llevar datos personales).
    const logLine = `${request.method} ${request.baseUrl}${request.path} -> ${body.statusCode}`;

    if (body.statusCode >= 500) {
      this.logger.error(logLine, exception instanceof Error ? exception.stack : String(exception));
    } else {
      this.logger.warn(`${logLine} ${body.message}`);
    }

    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'string') return { statusCode, message: payload };

      const { message, details } = payload as { message?: unknown; details?: unknown };
      return {
        statusCode,
        message: Array.isArray(message)
          ? message.join(' | ')
          : String(message ?? exception.message),
        ...(details === undefined ? {} : { details }),
      };
    }

    const code = pgErrorCode(exception);
    if (code) {
      const { status, message } = PG_ERRORS[code]!;
      return { statusCode: status, message };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ocurrio un error inesperado. Intentalo de nuevo mas tarde.',
    };
  }
}
