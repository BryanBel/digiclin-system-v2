import type { MeResponse } from '@digiclin/shared';
import { defineMiddleware } from 'astro:middleware';
import { serverApi } from './lib/api.server';
import { safeNext, withNext } from './lib/safe-next';

const matches = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

/** Paginas que exigen sesion. */
const PROTECTED = ['/cuenta', '/paciente', '/medico', '/admin'];
/** Portales del personal: aqui se exige la 2FA si la clinica la pide. */
const STAFF = ['/medico', '/admin'];
/** Paginas para quien aun no entro: con sesion, se salta a la cuenta. */
const GUEST_ONLY = ['/ingresar', '/registro'];

async function loadMe(request: Request): Promise<MeResponse | null> {
  const { data, response } = await serverApi(request).GET('/api/me');
  if (response.status === 401) return null;
  if (!data) throw new Error(`GET /api/me respondio ${response.status}`);
  return data;
}

/**
 * Decide a que puede entrar cada visita. Es comodidad y claridad para el usuario: la API
 * vuelve a comprobar el acceso en cada peticion, asi que saltarse esto no da acceso a datos.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname, search } = context.url;
  const isProtected = PROTECTED.some((base) => matches(pathname, base));
  const isGuestOnly = GUEST_ONLY.some((base) => pathname === base);
  if (!isProtected && !isGuestOnly) return next();

  const me = await loadMe(context.request);

  if (isGuestOnly) {
    if (me) return context.redirect(safeNext(context.url.searchParams.get('next')) ?? '/cuenta');
    return next();
  }

  if (!me) return context.redirect(withNext('/ingresar', pathname + search));
  context.locals.me = me;

  if (me.twoFactorRequired && STAFF.some((base) => matches(pathname, base))) {
    return context.redirect('/cuenta/seguridad?requerido=1');
  }
  if (matches(pathname, '/admin') && !me.access.admin) {
    return context.rewrite('/sin-acceso');
  }
  return next();
});
