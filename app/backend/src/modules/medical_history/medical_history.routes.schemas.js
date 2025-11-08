import { z } from 'zod';

const dateTimeSchema = z
  .string()
  .trim()
  .refine((value) => !value || !Number.isNaN(Date.parse(value)), 'Fecha inválida.');

const medicalInformSchema = z.string().trim().min(3, 'Describe el motivo o diagnóstico.').max(4000);

export const listMedicalHistorySchema = z.object({
  search: z.string().trim().min(1).optional(),
  patientId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

export const listOwnMedicalHistorySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

export const createMedicalHistorySchema = z.object({
  patientId: z.coerce.number().int().positive({ message: 'Selecciona un paciente válido.' }),
  entryDate: dateTimeSchema.optional(),
  medicalInform: medicalInformSchema,
  treatment: z.string().trim().max(4000).optional(),
  recipe: z.string().trim().max(4000).optional(),
  visitId: z.coerce.number().int().positive().optional(),
});

export const updateMedicalHistorySchema = z
  .object({
    entryDate: dateTimeSchema.optional(),
    medicalInform: medicalInformSchema.optional(),
    treatment: z.string().trim().max(4000).optional(),
    recipe: z.string().trim().max(4000).optional(),
    visitId: z.coerce.number().int().positive().optional(),
  })
  .refine(
    (data) => {
      return (
        data.entryDate !== undefined ||
        data.medicalInform !== undefined ||
        data.treatment !== undefined ||
        data.recipe !== undefined ||
        data.visitId !== undefined
      );
    },
    {
      message: 'Proporciona al menos un campo para actualizar.',
      path: ['medicalInform'],
    },
  );
