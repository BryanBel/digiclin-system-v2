import { API_INTERNAL_URL } from 'astro:env/server';
import createClient from 'openapi-fetch';
import type { paths } from './api-schema';

/**
 * Cliente de la API para el SSR de Astro. Reenvia la cookie de la peticion original para que
 * la API vea la misma sesion que el navegador. Un cliente por peticion: nunca compartir cookies.
 */
export function serverApi(request: Request) {
  return createClient<paths>({
    baseUrl: API_INTERNAL_URL,
    headers: { cookie: request.headers.get('cookie') ?? '' },
  });
}
