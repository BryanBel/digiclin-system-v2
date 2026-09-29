import { z } from 'zod';

/**
 * Enums del dominio clinico. Cada valor sigue un ValueSet de HL7 FHIR R5 cuando existe,
 * para que una futura fachada FHIR (interoperabilidad con laboratorios u otras clinicas)
 * sea un mapeo directo y no una traduccion.
 */

/**
 * Sexo administrativo (FHIR AdministrativeGender).
 * No es sexo biologico ni identidad de genero: es el dato de registro.
 * https://hl7.org/fhir/R5/valueset-administrative-gender.html
 */
export const administrativeSex = z.enum(['male', 'female', 'other', 'unknown']);
export type AdministrativeSex = z.infer<typeof administrativeSex>;

/**
 * Estados de cita: subconjunto de FHIR AppointmentStatus.
 * pending = solicitada, sin confirmar; booked = confirmada; arrived = el paciente llego;
 * fulfilled = atendida; cancelled = cancelada; noshow = el paciente no asistio.
 * https://hl7.org/fhir/R5/valueset-appointmentstatus.html
 */
export const appointmentStatus = z.enum([
  'pending',
  'booked',
  'arrived',
  'fulfilled',
  'cancelled',
  'noshow',
]);
export type AppointmentStatus = z.infer<typeof appointmentStatus>;

/**
 * Roles de un miembro dentro de una clinica (organizacion).
 * owner = dueno; admin = socio directivo; doctor = medico tratante.
 * Ser paciente no es un rol de miembro: sale de tener un registro en `patients`.
 */
export const clinicRole = z.enum(['owner', 'admin', 'doctor']);
export type ClinicRole = z.infer<typeof clinicRole>;
