import createClient from 'openapi-fetch';
import type { paths } from './api-schema';

export type { paths };

/**
 * Cliente de la API para el navegador. Siempre relativo (/api/...): en desarrollo lo reenvia
 * el proxy de Vite y en produccion es el mismo origen, asi la cookie de sesion viaja sola.
 * Para el SSR usa serverApi() de api.server.ts.
 */
export const browserApi = createClient<paths>({ baseUrl: '', credentials: 'same-origin' });
