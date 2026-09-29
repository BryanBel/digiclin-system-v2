import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { SchemaObject } from '@nestjs/swagger';
import { z } from 'zod';

/**
 * Puente propio entre Zod 4 y Nest. nestjs-zod aun no soporta Nest 12, y Zod 4 ya genera
 * JSON Schema de forma nativa, asi que basta con esto.
 *
 * Uso:
 *   @ApiBody({ schema: toOpenApi(createPatientBody) })
 *   create(@Body(new ZodValidationPipe(createPatientBody)) body: CreatePatientBody) {}
 */
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform<unknown, z.output<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Los datos enviados no son validos.',
        details: result.error.issues.map((issue) => ({
          path: issue.path.join('.') || '(raiz)',
          message: issue.message,
          code: issue.code,
        })),
      });
    }
    return result.data;
  }
}

/**
 * Convierte un schema Zod a un Schema Object de OpenAPI 3.0 para Swagger.
 * `io: 'input'` describe lo que el cliente envia (cuerpos); `'output'` lo que la API devuelve.
 */
export function toOpenApi(schema: z.ZodType, io: 'input' | 'output' = 'output'): SchemaObject {
  const { $schema: _ignored, ...jsonSchema } = z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io,
  }) as Record<string, unknown>;
  return jsonSchema as SchemaObject;
}
