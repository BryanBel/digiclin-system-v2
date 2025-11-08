import { z } from 'zod';
import { ALLOWED_REQUEST_STATUSES } from './appointment_requests.constants.js';

export const createAppointmentRequestSchema = z.object({
  fullName: z.string().min(1, 'Ingresa tu nombre completo'),
  email: z.string().email('Correo inválido'),
  phone: z.string().min(6, 'Teléfono inválido'),
  documentId: z.string().min(5, 'Ingresa un documento válido'),
  birthDate: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'Selecciona una fecha de nacimiento válida',
    })
    .transform((value) => new Date(value))
    .refine(
      (date) => {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const normalizedBirth = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        return normalizedBirth <= today;
      },
      { message: 'La fecha de nacimiento no puede ser futura.' },
    ),
  gender: z.enum(['male', 'female'], {
    errorMap: () => ({ message: 'Selecciona un género válido' }),
  }),
  age: z.coerce.number().int().min(0).max(130).optional(),
  symptoms: z.string().min(5, 'Describe brevemente tus síntomas'),
  preferredDate: z
    .string()
    .optional()
    .transform((value) => (value ? new Date(value) : undefined)),
  preferredTimeRange: z.string().optional(),
  isExistingPatient: z.boolean().default(false),
});

export const listAppointmentRequestsSchema = z.object({
  status: z.enum(ALLOWED_REQUEST_STATUSES).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

export const updateAppointmentRequestSchema = z
  .object({
    status: z.enum(ALLOWED_REQUEST_STATUSES),
    adminNote: z.string().optional(),
  })
  .refine(
    (data) => {
      if (['rejected', 'reschedule'].includes(data.status)) {
        return Boolean(data.adminNote?.trim());
      }
      return true;
    },
    {
      message: 'Incluye una nota administrativa para este estado.',
      path: ['adminNote'],
    },
  );

export const confirmAppointmentRequestSchema = z.object({
  doctorEmail: z.string().email('Ingresa el correo del doctor'),
  scheduledFor: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'Selecciona una fecha u hora válida',
    })
    .transform((value) => new Date(value)),
  adminNote: z.string().optional(),
});

export const rescheduleAppointmentRequestSchema = z.object({
  scheduledFor: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'Selecciona una fecha u hora válida',
    })
    .transform((value) => new Date(value)),
  adminNote: z.string().min(3, 'Agrega una nota para la reprogramación'),
});

export const linkAppointmentTokenSchema = z.object({
  token: z.string().min(16, 'El enlace proporcionado no es válido'),
});
