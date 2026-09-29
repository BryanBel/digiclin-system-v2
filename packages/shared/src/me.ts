import { z } from 'zod';
import { clinicRole } from './domain.js';
import { practitionerStatus } from './practitioners.js';

/**
 * Quien soy y a que puedo entrar. La web lo usa para decidir que mostrar; la API vuelve a
 * comprobar el acceso en cada endpoint (esto no es la autorizacion, es su resumen).
 */
export const meResponse = z.object({
  user: z.object({
    id: z.uuid(),
    name: z.string(),
    email: z.email(),
    emailVerified: z.boolean(),
    twoFactorEnabled: z.boolean(),
  }),
  clinic: z
    .object({
      id: z.uuid(),
      name: z.string(),
      /** Una persona puede tener varios roles: el dueno de una clinica suele ser medico. */
      roles: z.array(clinicRole),
    })
    .nullable(),
  practitioner: z.object({ status: practitionerStatus }).nullable(),
  access: z.object({
    /** Portal de administracion: dueno o socio de la clinica. */
    admin: z.boolean(),
    /** Portal medico operativo: solicitud aprobada y miembro de la clinica. */
    doctor: z.boolean(),
    /** Toda cuenta verificada puede usar el portal de paciente. */
    patient: z.literal(true),
  }),
  /** Personal sin verificacion en dos pasos cuando la clinica la exige. */
  twoFactorRequired: z.boolean(),
});
export type MeResponse = z.infer<typeof meResponse>;
