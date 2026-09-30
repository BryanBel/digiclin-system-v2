import { describe, expect, it } from 'vitest';
import { safeNext, withNext } from './safe-next';

describe('safeNext', () => {
  it.each(['/medico', '/admin/medicos?status=pending', '/invitacion/abc'])('acepta %s', (value) => {
    expect(safeNext(value)).toBe(value);
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    'medico',
    '/api/me',
    '/ruta\nfalsa',
    '',
    null,
    undefined,
  ])('rechaza %s', (value) => {
    expect(safeNext(value)).toBeNull();
  });
});

describe('withNext', () => {
  it('codifica el destino seguro', () => {
    expect(withNext('/ingresar', '/admin/medicos?status=pending')).toBe(
      '/ingresar?next=%2Fadmin%2Fmedicos%3Fstatus%3Dpending',
    );
  });

  it('omite un destino inseguro', () => {
    expect(withNext('/ingresar', '//evil.example')).toBe('/ingresar');
  });
});
