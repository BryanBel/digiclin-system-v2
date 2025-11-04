import { z } from 'zod';

const basePatientSchema = {
  full_name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  phone: z
    .string()
    .trim()
    .min(6, 'El teléfono debe tener al menos 6 caracteres.')
    .optional()
    .nullable(),
  email: z.string().email('El correo no es válido.').optional().nullable(),
  document_id: z.string().trim().min(3).optional().nullable(),
  birth_date: z
    .union([z.coerce.date(), z.string().trim().length(0), z.null()])
    .optional()
    .nullable()
    .transform((value) => (value instanceof Date ? value : null)),
  preferred_channel: z.string().trim().min(2).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
};

export const createPatientSchema = {
  body: z.object(basePatientSchema),
};

export const updatePatientSchema = {
  body: z.object({
    ...basePatientSchema,
  }),
  params: z.object({
    id: z.string(),
  }),
};
