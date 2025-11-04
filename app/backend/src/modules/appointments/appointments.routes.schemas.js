import { z } from 'zod';

const nullableString = z.string().trim().min(1).optional().nullable();

const nullableDate = z
  .union([z.coerce.date(), z.string().trim().length(0), z.null()])
  .optional()
  .transform((value) => (value instanceof Date ? value : null));

const patientPayloadSchema = z.object({
  full_name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  phone: z
    .string()
    .trim()
    .min(6, 'El teléfono debe tener al menos 6 caracteres.')
    .optional()
    .nullable(),
  email: z.string().email('El correo no es válido.').optional().nullable(),
  document_id: z.string().trim().min(3).optional().nullable(),
  birth_date: nullableDate,
  preferred_channel: z.string().trim().min(2).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export const createScheduledAppointmentSchema = {
  body: z
    .object({
      patient_id: z.number().int().positive().optional(),
      patient: patientPayloadSchema.optional(),
      doctor_id: z.string().uuid().optional().nullable(),
      scheduled_for: nullableDate,
      duration_minutes: z.number().int().positive().max(480).optional(),
      reason: z.string().trim().min(3, 'La razón debe tener al menos 3 caracteres.'),
      additional_notes: nullableString,
      channel: z.enum(['public', 'portal', 'admin']).optional(),
      priority: z.enum(['routine', 'priority', 'emergency']).optional(),
      status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
      created_by_user: z.string().uuid().optional().nullable(),
      intake_payload: z.record(z.unknown()).optional(),
    })
    .refine((data) => data.patient_id || data.patient, {
      message: 'Debe proporcionar un paciente existente o los datos del paciente.',
      path: ['patient'],
    }),
};

export const createEmergencyAppointmentSchema = {
  body: z.object({
    emergency_type: z.string().trim().min(3, 'Debe indicar el tipo de emergencia.'),
    name: z.string().trim().optional().nullable(),
    phone: z.string().trim().optional().nullable(),
    description: z.string().trim().optional().nullable(),
    datetime: nullableDate,
    duration_minutes: z.number().int().positive().max(240).optional(),
    incident_location: z.string().trim().optional().nullable(),
    transport_mode: z.string().trim().optional().nullable(),
    doctor_id: z.string().uuid().optional().nullable(),
    additional_notes: z.string().trim().optional().nullable(),
  }),
};
