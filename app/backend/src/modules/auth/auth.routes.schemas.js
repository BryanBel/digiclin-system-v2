import { z } from 'zod/v4';

const patientProfileSchema = z
  .object({
    phone: z
      .string({ invalid_type_error: 'El teléfono debe ser texto.' })
      .min(6, 'Proporciona un teléfono válido.')
      .max(32, 'El teléfono es demasiado largo.')
      .optional(),
    documentId: z
      .string({ invalid_type_error: 'El documento debe ser texto.' })
      .min(3, 'Proporciona un documento válido.')
      .max(64, 'El documento es demasiado largo.')
      .optional(),
    birthDate: z
      .string()
      .refine((value) => !value || !Number.isNaN(Date.parse(value)), 'Fecha de nacimiento inválida')
      .optional(),
    gender: z.enum(['male', 'female']).optional(),
    age: z.coerce.number().int().min(0).max(130).optional(),
  })
  .partial();

export const loginUserRouteSchema = {
  params: z.object({}),
  body: z.object({
    email: z.string(),
    password: z.string(),
  }),
  queries: z.object({}),
};

export const registerUserRouteSchema = {
  params: z.object({}),
  body: z
    .object({
      fullName: z.string().min(1, 'El nombre es obligatorio').optional(),
      email: z.string().email(),
      password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
      role: z.enum(['doctor', 'patient', 'admin']).optional(),
      patientProfile: patientProfileSchema.optional(),
    })
    .superRefine((data, ctx) => {
      const role = data.role ?? 'doctor';
      if (role !== 'patient') return;

      const profile = data.patientProfile ?? {};

      if (!profile.phone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Proporciona un teléfono de contacto.',
          path: ['patientProfile', 'phone'],
        });
      }

      if (!profile.documentId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Proporciona tu documento de identidad.',
          path: ['patientProfile', 'documentId'],
        });
      }

      if (!profile.birthDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selecciona tu fecha de nacimiento.',
          path: ['patientProfile', 'birthDate'],
        });
      }

      if (!profile.gender) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selecciona tu género.',
          path: ['patientProfile', 'gender'],
        });
      }
    }),
  queries: z.object({}),
};

export const verifyEmailRouteSchema = {
  params: z.object({
    token: z.string(),
  }),
  body: z.object({}),
  queries: z.object({}),
};

export const getLoggedUserRouteSchema = {
  params: z.object({}),
  body: z.object({}),
  queries: z.object({}),
};

export const logOutUserRouteSchema = {
  params: z.object({}),
  body: z.object({}),
  queries: z.object({}),
};
