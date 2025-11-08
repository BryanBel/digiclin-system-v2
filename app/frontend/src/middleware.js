import { defineMiddleware } from 'astro/middleware';

const normalizeUrl = (value = '') => value.replace(/\/$/, '');

const resolveBackendUrl = (context) => {
  const envBackend =
    process.env.BACKEND_URL ?? process.env.PUBLIC_BACKEND_URL ?? process.env.PUBLIC_BACKEND ?? '';

  if (envBackend && envBackend.trim().length > 0) {
    return normalizeUrl(envBackend.trim());
  }

  try {
    const requestUrl = new URL(context.request.url);
    return `${requestUrl.protocol}//${requestUrl.host}`;
  } catch {
    return 'http://localhost:3000';
  }
};

export const onRequest = defineMiddleware(async (context, next) => {
  const backendUrl = resolveBackendUrl(context);
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
