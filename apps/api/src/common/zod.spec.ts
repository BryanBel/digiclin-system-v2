import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { toOpenApi, ZodValidationPipe } from './zod.js';

const body = z.object({
  fullName: z.string().min(1),
  age: z.coerce.number().int().default(0),
});

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(body);

  it('devuelve los datos ya transformados', () => {
    expect(pipe.transform({ fullName: 'Ana', age: '42' })).toEqual({ fullName: 'Ana', age: 42 });
  });

  it('descarta campos que no estan en el schema', () => {
    expect(pipe.transform({ fullName: 'Ana', role: 'admin' })).toEqual({ fullName: 'Ana', age: 0 });
  });

  it('lanza 400 con el detalle de cada campo invalido', () => {
    try {
      pipe.transform({ fullName: '' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as { details: unknown[] };
      expect(response.details).toEqual([
        expect.objectContaining({ path: 'fullName', code: 'too_small' }),
      ]);
    }
  });
});

describe('toOpenApi', () => {
  it('genera un Schema Object de OpenAPI 3.0 sin la clave $schema', () => {
    const schema = toOpenApi(body, 'input');
    expect(schema).not.toHaveProperty('$schema');
    expect(schema).toMatchObject({
      type: 'object',
      properties: { fullName: { type: 'string', minLength: 1 } },
      required: ['fullName'],
    });
  });
});
