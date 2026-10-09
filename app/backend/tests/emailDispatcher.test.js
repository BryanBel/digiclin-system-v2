import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const resendSend = vi.fn();
const smtpSend = vi.fn();

vi.mock('../src/services/resend.js', () => ({
  getResendClient: () => ({ emails: { send: resendSend } }),
}));
vi.mock('../src/services/nodemailer.js', () => ({ default: { sendMail: smtpSend } }));

const { sendEmail } = await import('../src/services/emailDispatcher.js');

const mail = {
  to: 'Paciente Ana <ana@example.com>',
  subject: 'Verifica tu correo',
  text: 'Enlace: https://x/verify',
  html: '<a href="https://x/verify">Verificar</a>',
};

describe('sendEmail', () => {
  let fetchMock;

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'prod');
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('BREVO_API_KEY', 'brevo-test');
    vi.stubEnv('BREVO_SENDER_EMAIL', 'remitente@example.com');
    vi.stubEnv('EMAIL_USER', 'smtp@example.com');
    vi.stubEnv('EMAIL_PASS', 'smtp-pass');
    fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    resendSend.mockReset();
    smtpSend.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('usa Resend cuando la API acepta el envio', async () => {
    resendSend.mockResolvedValue({ data: { id: '1' }, error: null });

    await expect(sendEmail(mail)).resolves.toEqual({ provider: 'resend' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('si Resend devuelve error (sin lanzar), lo registra y pasa a Brevo', async () => {
    resendSend.mockResolvedValue({ data: null, error: { name: 'validation_error' } });

    await expect(sendEmail(mail)).resolves.toEqual({ provider: 'brevo' });
    expect(console.error).toHaveBeenCalledWith('[EMAIL][RESEND_FAIL]', {
      name: 'validation_error',
    });
  });

  it('envia a Brevo con la clave en api-key y el destinatario separado en nombre y correo', async () => {
    vi.stubEnv('RESEND_API_KEY', '');

    await sendEmail(mail);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(init.headers['api-key']).toBe('brevo-test');
    expect(JSON.parse(init.body)).toMatchObject({
      sender: { email: 'remitente@example.com', name: 'DigiClin' },
      to: [{ name: 'Paciente Ana', email: 'ana@example.com' }],
      subject: 'Verifica tu correo',
      htmlContent: mail.html,
      textContent: mail.text,
    });
  });

  it('si Brevo rechaza el envio, intenta SMTP', async () => {
    resendSend.mockResolvedValue({ data: null, error: { name: 'x' } });
    fetchMock.mockResolvedValue(new Response('sender not valid', { status: 400 }));
    smtpSend.mockResolvedValue({});

    await expect(sendEmail(mail)).resolves.toEqual({ provider: 'nodemailer' });
    expect(console.error).toHaveBeenCalledWith('[EMAIL][BREVO_FAIL]', 400, 'sender not valid');
  });

  it('si todos fallan, lanza error en lugar de darlo por enviado', async () => {
    resendSend.mockResolvedValue({ data: null, error: { name: 'x' } });
    fetchMock.mockRejectedValue(new Error('timeout'));
    smtpSend.mockRejectedValue(new Error('ETIMEDOUT'));

    await expect(sendEmail(mail)).rejects.toThrow('No se pudo enviar');
  });
});
