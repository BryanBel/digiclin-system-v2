import { describe, expect, it, vi } from 'vitest';
import { BrevoMailer } from './mailer.js';
import { escapeHtml, mailTemplates } from './templates.js';

describe('BrevoMailer', () => {
  const from = { email: 'clinica@example.com', name: 'DigiClin' };
  const message = mailTemplates.verifyEmail(
    { email: 'ana@example.com', name: 'Ana' },
    'https://x/verify',
  );

  it('envia a la API v3 de Brevo con la clave en la cabecera api-key', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    await new BrevoMailer('clave-secreta', from, fetchFn).send(message);

    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(init.headers['api-key']).toBe('clave-secreta');
    expect(JSON.parse(init.body)).toMatchObject({
      sender: from,
      to: [{ email: 'ana@example.com', name: 'Ana' }],
      subject: message.subject,
    });
  });

  it('lanza error si Brevo rechaza el envio (no lo da por enviado)', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('sender not verified', { status: 400 }));
    await expect(new BrevoMailer('k', from, fetchFn).send(message)).rejects.toThrow(/400/);
  });
});

describe('plantillas de correo', () => {
  it('escapa en el HTML los datos que escribe un usuario', () => {
    const mail = mailTemplates.practitionerRejected(
      { email: 'x@example.com', name: '<script>alert(1)</script>' },
      { clinicName: 'Clinica', reason: '<img src=x onerror=alert(1)>' },
    );
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).not.toContain('<img');
    expect(mail.text).toContain('<img src=x onerror=alert(1)>');
  });

  it('incluye el enlace en el HTML y en el texto plano', () => {
    const mail = mailTemplates.resetPassword({ email: 'x@example.com' }, 'https://x/reset?a=1&b=2');
    expect(mail.html).toContain('https://x/reset?a=1&amp;b=2');
    expect(mail.text).toContain('https://x/reset?a=1&b=2');
  });

  it('escapeHtml cubre los cinco caracteres especiales', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
});
