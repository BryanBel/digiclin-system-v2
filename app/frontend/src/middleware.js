import { defineMiddleware } from 'astro/middleware';

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3000';

export const onRequest = defineMiddleware(async (context, next) => {
  const cookieHeader = context.request.headers.get('cookie');

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
      }
    } catch (error) {
      console.warn('No se pudo recuperar el usuario SSR:', error);
    }
  }

  return next();
});
