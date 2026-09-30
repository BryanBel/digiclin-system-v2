import { organizationClient, twoFactorClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/**
 * Cliente de Better Auth para las islas React. Mismo origen que la web: /api/auth.
 * En el SSR de las islas no hay window; la URL base solo importa en el navegador.
 */
export const authClient = createAuthClient({
  baseURL: typeof window === 'undefined' ? 'http://localhost' : window.location.origin,
  basePath: '/api/auth',
  plugins: [
    organizationClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        const next = new URLSearchParams(window.location.search).get('next');
        window.location.assign(
          `/ingresar/dos-pasos${next ? `?next=${encodeURIComponent(next)}` : ''}`,
        );
      },
    }),
  ],
});
