/**
 * Valida el destino de ?next= antes de redirigir. Solo rutas internas: la v2 tenia un
 * redirect abierto (login.astro aceptaba cualquier URL, incluso javascript:).
 */
export function safeNext(value: string | null | undefined): string | null {
  if (!value) return null;
  // Ruta absoluta del mismo sitio: "/algo", pero no "//host" ni "/\host" (el navegador los
  // interpreta como otro dominio) ni caracteres de control.
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  const hasControlChars = [...value].some((char) => {
    const code = char.charCodeAt(0);
    return code < 0x20 || code === 0x7f;
  });
  if (hasControlChars) return null;
  // Las rutas de la API no son paginas a las que volver.
  if (value === '/api' || value.startsWith('/api/')) return null;
  return value;
}

/** Agrega ?next= a una ruta solo si es seguro. */
export function withNext(path: string, next: string | null | undefined): string {
  const safe = safeNext(next);
  return safe ? `${path}?next=${encodeURIComponent(safe)}` : path;
}
