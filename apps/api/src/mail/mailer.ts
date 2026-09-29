import { Logger } from '@nestjs/common';

export interface MailMessage {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
}

/** Contrato unico de envio: cambiar de proveedor es cambiar de adaptador, no de codigo. */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export const MAILER = Symbol('MAILER');

/** Desarrollo: imprime el correo (con sus enlaces) en la consola de la API. */
export class ConsoleMailer implements Mailer {
  private readonly logger = new Logger('Correo');

  async send({ to, subject, text }: MailMessage) {
    this.logger.log(`\nPara: ${to.email}\nAsunto: ${subject}\n\n${text}\n`);
  }
}

/**
 * Brevo, API transaccional v3 (POST /v3/smtp/email). Permite un remitente verificado sin
 * dominio propio, suficiente para el piloto.
 * https://developers.brevo.com/reference/sendtransacemail
 */
export class BrevoMailer implements Mailer {
  static readonly ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

  constructor(
    private readonly apiKey: string,
    private readonly from: { email: string; name: string },
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async send({ to, subject, html, text }: MailMessage) {
    const response = await this.fetchFn(BrevoMailer.ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: this.from,
        to: [to.name ? { email: to.email, name: to.name } : { email: to.email }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Brevo respondio ${response.status}: ${detail.slice(0, 300)}`);
    }
  }
}
