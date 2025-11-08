export function getNavigationLinks(user, pathname) {
  const links = [
    { type: 'link', text: 'Inicio', path: '/', isActive: pathname === '/' },
    {
      type: 'link',
      text: 'Agendar cita',
      path: '/schedule-appointments',
      isActive: pathname === '/schedule-appointments',
    },
  ];

  if (user) {
    if (user.role === 'admin') {
      links.push({
        type: 'link',
        text: 'Solicitudes',
        path: '/admin/appointment-requests',
        isActive: pathname === '/admin/appointment-requests',
      });
      links.push({
        type: 'link',
        text: 'Citas planificadas',
        path: '/admin/appointments',
        isActive: pathname === '/admin/appointments',
      });
      links.push({
        type: 'link',
        text: 'Pacientes',
        path: '/admin/patients',
        isActive: pathname === '/admin/patients',
      });
      links.push({
        type: 'link',
        text: 'Historiales médicos',
        path: '/admin/medical-history',
        isActive: pathname === '/admin/medical-history',
      });
    } else if (user.role === 'patient') {
      links.push({
        type: 'link',
        text: 'Mis citas',
        path: '/patient/appointments',
        isActive: pathname === '/patient/appointments',
      });
      links.push({
        type: 'link',
        text: 'Mi historial médico',
        path: '/patient/medical-history',
        isActive: pathname === '/patient/medical-history',
      });
    }

    links.push({ type: 'button', text: 'Cerrar sesión', action: 'logout' });
  } else {
    links.push({
      type: 'link',
      text: 'Acceder',
      path: '/login',
      isActive: pathname === '/login',
    });
    links.push({
      type: 'link',
      text: 'Registrarse',
      path: '/signup',
      isActive: pathname === '/signup',
    });
  }

  return links;
}