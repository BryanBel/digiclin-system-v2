import { z } from 'zod';

/**
 * Estado del medico frente a una clinica.
 * pending = solicitud enviada; approved = puede atender; rejected = solicitud rechazada
 * (puede corregir y reenviar); suspended = acceso retirado por la clinica.
 */
export const practitionerStatus = z.enum(['pending', 'approved', 'rejected', 'suspended']);
export type PractitionerStatus = z.infer<typeof practitionerStatus>;

/**
 * Credencial profesional, modelada como FHIR Practitioner.qualification (code + identifier +
 * issuer). Texto libre a proposito: cada pais tiene sus propios registros. En Venezuela lo
 * habitual en el recipe es el numero del MPPS y el del Colegio de Medicos (por verificar con
 * cada clinica). https://hl7.org/fhir/R5/practitioner-definitions.html#Practitioner.qualification
 */
export const qualification = z.object({
  /** Tipo de registro, p. ej. "MPPS" o "Colegio de Médicos". */
  type: z.string(),
  /** Numero de registro tal como aparece en el documento. */
  number: z.string(),
  /** Entidad emisora, p. ej. "Colegio de Médicos del Distrito Capital". */
  issuer: z.string().optional(),
  /** Pais emisor, ISO 3166-1 alfa-2 en mayusculas. */
  country: z.string().length(2),
});
export type Qualification = z.infer<typeof qualification>;

/** Lo que envia el formulario: valida y normaliza (recorta espacios, pais en mayusculas). */
export const qualificationInput = z.object({
  type: z.string().trim().min(2, 'Indica el tipo de registro').max(80),
  number: z.string().trim().min(1, 'Indica el número de registro').max(40),
  issuer: z.string().trim().max(120).optional(),
  country: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, 'Código de país de 2 letras (ISO 3166-1)')
    .transform((code) => code.toUpperCase())
    .default('VE'),
});

export const practitionerApplicationBody = z.object({
  specialties: z
    .array(z.string().trim().min(2).max(80))
    .min(1, 'Indica al menos una especialidad')
    .max(5),
  qualifications: z
    .array(qualificationInput)
    .min(1, 'Indica al menos un registro profesional')
    .max(5),
});
export type PractitionerApplicationBody = z.input<typeof practitionerApplicationBody>;

export const practitionerProfile = z.object({
  userId: z.uuid(),
  clinicId: z.uuid().nullable(),
  status: practitionerStatus,
  specialties: z.array(z.string()),
  qualifications: z.array(qualification),
  reviewNote: z.string().nullable(),
  reviewedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type PractitionerProfile = z.infer<typeof practitionerProfile>;

/** Fila del listado de solicitudes que ve la administracion. */
export const practitionerApplication = practitionerProfile.extend({
  name: z.string(),
  email: z.email(),
});
export type PractitionerApplication = z.infer<typeof practitionerApplication>;

export const rejectPractitionerBody = z.object({
  reason: z
    .string()
    .trim()
    .min(10, 'Explica el motivo (mínimo 10 caracteres): el médico lo recibirá por correo')
    .max(500),
});
