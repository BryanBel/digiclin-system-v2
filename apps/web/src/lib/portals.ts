export type PortalId = 'admin' | 'medico' | 'paciente';

export interface PortalNavItem {
  label: string;
  href: string;
  /** false = seccion planificada que aun no existe; se muestra deshabilitada. */
  ready: boolean;
}

export interface Portal {
  id: PortalId;
  title: string;
  nav: PortalNavItem[];
}

/** Secciones de cada portal segun el plan del MVP. Se activan fase a fase. */
export const PORTALS: Record<PortalId, Portal> = {
  admin: {
    id: 'admin',
    title: 'Administración',
    nav: [
      { label: 'Resumen', href: '/admin', ready: true },
      { label: 'Médicos', href: '/admin/medicos', ready: true },
      { label: 'Socios', href: '/admin/socios', ready: true },
      { label: 'Pacientes', href: '/admin/pacientes', ready: false },
      { label: 'Citas', href: '/admin/citas', ready: false },
      { label: 'Auditoría', href: '/admin/auditoria', ready: false },
      { label: 'Clínica', href: '/admin/clinica', ready: false },
    ],
  },
  medico: {
    id: 'medico',
    title: 'Médico',
    nav: [
      { label: 'Inicio', href: '/medico', ready: true },
      { label: 'Agenda', href: '/medico/agenda', ready: false },
      { label: 'Mis pacientes', href: '/medico/pacientes', ready: false },
    ],
  },
  paciente: {
    id: 'paciente',
    title: 'Paciente',
    nav: [
      { label: 'Inicio', href: '/paciente', ready: true },
      { label: 'Mis citas', href: '/paciente/citas', ready: false },
      { label: 'Mi historia', href: '/paciente/historia', ready: false },
      { label: 'Mis récipes', href: '/paciente/recipes', ready: false },
      { label: 'Mis exámenes', href: '/paciente/examenes', ready: false },
    ],
  },
};
