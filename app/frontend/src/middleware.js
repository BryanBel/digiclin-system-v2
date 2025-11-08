import { defineMiddleware } from 'astro/middleware';

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3000';

export const onRequest = defineMiddleware(async (context, next) => {
  const cookieHeader = context.request.headers.get('cookie');
  context.locals.patientProfile = null;

  if (cookieHeader?.includes('access_token=')) {
    try {
      const response = await fetch(`${backendUrl}/api/auth/user`, {
        headers: {
          cookie: cookieHeader,
          accept: 'application/json',
        },
      });

      if (response.ok) {
        const user = await response.json();
        context.locals.user = user;

        if (user?.role === 'patient') {
          try {
            const profileResponse = await fetch(`${backendUrl}/api/patients/me`, {
              headers: {
                cookie: cookieHeader,
                accept: 'application/json',
              },
            });

            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              context.locals.patientProfile = profileData?.patient ?? null;
            }
          } catch (profileError) {
            console.warn('No se pudo recuperar el perfil del paciente:', profileError);
          }
        }
      }
    } catch (error) {
      console.warn('No se pudo recuperar el usuario SSR:', error);
    }
  }

  return next();
});
