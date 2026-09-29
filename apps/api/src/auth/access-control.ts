import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements, ownerAc } from 'better-auth/plugins/organization/access';

/**
 * Permisos de gestion de la clinica (organizacion de Better Auth). Solo cubren la
 * administracion: miembros e invitaciones. El acceso a datos clinicos NO se decide aqui sino
 * en AccessPolicyService (relacion de atencion), porque depende del paciente, no del rol.
 */
export const ac = createAccessControl(defaultStatements);

export const clinicRoles = {
  /** Dueno: todo. Es el unico que cambia roles o retira miembros. */
  owner: ac.newRole(ownerAc.statements),
  /**
   * Socio directivo: edita los datos de la clinica e invita. A quien puede invitar lo limita
   * el hook beforeCreateInvitation (solo medicos). Sin permisos sobre miembros.
   */
  admin: ac.newRole({ organization: ['update'], invitation: ['create', 'cancel'] }),
  /** Medico: miembro sin permisos de gestion. */
  doctor: ac.newRole({}),
};

export type ClinicRoleName = keyof typeof clinicRoles;
