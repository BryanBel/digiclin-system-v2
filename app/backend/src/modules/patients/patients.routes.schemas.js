import { z } from 'zod';

export const createPatientSchema = {
  body: z.object({
    name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
    phone: z.string().optional().nullable(),
    cedula: z.string().optional().nullable(),
  }),
};

export const updatePatientSchema = {
  body: z.object({
    name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.').optional(),
    phone: z.string().optional().nullable(),
    cedula: z.string().optional().nullable(),
  }),
  params: z.object({
    id: z.string(), // The ID comes as a string from params
  }),
};
