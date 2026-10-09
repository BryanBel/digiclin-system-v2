import { getResendClient } from './resend.js';
import nodemailerService from './nodemailer.js';

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value];
};

const escapeHtml = (value = '') =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const textToHtml = (value = '') => escapeHtml(value).replace(/\n/g, '<br />');

const buildMessage = ({ to, subject, text, html, from }) => {
  const fallbackFrom =
    from || process.env.RESEND_FROM_EMAIL || process.env.EMAIL_USER || 'onboarding@resend.dev';

  const requestedRecipients = toArray(to);

  // Desvio de correo para desarrollo.
  //
  // El plan gratuito de Resend solo entrega a la direccion verificada de la cuenta, asi
  // que durante el desarrollo todo se redirigia a una sola bandeja. Esa redireccion tenia
  // como valor por defecto un correo personal escrito en el codigo, y la condicion que la
  // activaba era siempre verdadera -- de modo que en produccion cada mensaje del sistema
  // llegaba a esa bandeja en lugar de al paciente. Nadie recibia su enlace de
  // verificacion, y por tanto nadie podia activar su cuenta.
  //
  // Ahora hay que pedirla explicitamente, no tiene valor por defecto, y no se aplica en
  // produccion bajo ninguna circunstancia: el costo de equivocarse aqui es que el sistema
  // deje de funcionar en silencio, y el de la guarda es cero.
  const isProduction = process.env.NODE_ENV === 'prod';
  const redirectInbox = isProduction ? null : process.env.EMAIL_REDIRECT_TO?.trim() || null;

  const forcedInbox = redirectInbox;
  const forcedRecipients = forcedInbox ? [forcedInbox] : requestedRecipients;
  const baseSubject = subject ?? '';
  const baseText = typeof text === 'string' ? text : '';
  const baseHtml = typeof html === 'string' ? html : null;

  const recipientsLabel = requestedRecipients.join(', ') || 'Sin registro';
  const recipientsLabelHtml = escapeHtml(recipientsLabel);

  const subjectWithHint = forcedInbox ? `[FOR ${recipientsLabel}] ${baseSubject}` : baseSubject;

  const hintText = `---
Destinatario original: ${recipientsLabel}`;

  const textWithHint = forcedInbox ? `${baseText ? `${baseText}\n\n` : ''}${hintText}` : baseText;

  const htmlHint = `<hr style="margin-top:24px;margin-bottom:16px;border:0;border-top:1px solid #e5e7eb;" />
<p style="font-size:12px;color:#6b7280;margin:0;">Destinatario original: ${recipientsLabelHtml}</p>`;

  const fallbackHtmlContent = `${baseText ? `<p>${textToHtml(baseText)}</p>` : ''}${htmlHint}`;

  let htmlWithHint;

  if (forcedInbox) {
    htmlWithHint = baseHtml ? `${baseHtml}${htmlHint}` : fallbackHtmlContent;
  } else if (baseHtml === null) {
    htmlWithHint = undefined;
  } else {
    htmlWithHint = baseHtml;
  }

  return {
    to: forcedRecipients,
    subject: subjectWithHint,
    text: textWithHint,
    html: htmlWithHint,
    from: fallbackFrom,
  };
};

const sendViaResend = async ({ to, subject, text, html, from }) => {
  if (!process.env.RESEND_API_KEY) {
    return false;
  }

  const resend = getResendClient();
  if (!resend) return false;

  const message = buildMessage({ to, subject, text, html, from });

  try {
    // El SDK de Resend no lanza cuando la API rechaza el envio (remitente sin verificar,
    // destinatario no permitido): devuelve { data: null, error }. Antes se ignoraba ese
    // valor, el envio contaba como exitoso y nunca se probaba el respaldo.
    const { error } = await resend.emails.send(message);
    if (error) {
      console.error('[EMAIL][RESEND_FAIL]', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[EMAIL][RESEND_FAIL]', error);
    return false;
  }
};

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

/** "Nombre <correo@x.com>" -> { name, email }; un correo suelto -> { email }. */
const parseAddress = (value) => {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(value);
  if (!match) return { email: value.trim() };
  return match[1] ? { name: match[1], email: match[2] } : { email: match[2] };
};

/**
 * Brevo por su API HTTP (puerto 443). El plan gratuito de Render bloquea el SMTP saliente
 * (puertos 25, 465 y 587) desde el 26-sep-2025, asi que el respaldo por Gmail no sale desde
 * produccion. Un remitente de un dominio gratuito (gmail.com) no se puede autenticar en
 * Brevo: lo reemplaza por una direccion @brevosend.com, pero el correo llega.
 */
const sendViaBrevo = async ({ to, subject, text, html }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!apiKey || !senderEmail) return false;

  const message = buildMessage({ to, subject, text, html, from: senderEmail });

  try {
    const response = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: process.env.BREVO_SENDER_NAME || 'DigiClin' },
        to: message.to.map(parseAddress),
        subject: message.subject,
        ...(message.html ? { htmlContent: message.html } : {}),
        ...(message.text ? { textContent: message.text } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('[EMAIL][BREVO_FAIL]', response.status, detail.slice(0, 300));
      return false;
    }
    return true;
  } catch (error) {
    console.error('[EMAIL][BREVO_FAIL]', error);
    return false;
  }
};

const sendViaNodemailer = async ({ to, subject, text, html, from }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return false;
  }

  const message = buildMessage({ to, subject, text, html, from });

  try {
    await nodemailerService.sendMail(message);
    return true;
  } catch (error) {
    console.error('[EMAIL][NODEMAILER_FAIL]', error);
    return false;
  }
};

export const sendEmail = async ({ to, subject, text, html, from }) => {
  const deliveredViaResend = await sendViaResend({ to, subject, text, html, from });
  if (deliveredViaResend) {
    return { provider: 'resend' };
  }

  const deliveredViaBrevo = await sendViaBrevo({ to, subject, text, html, from });
  if (deliveredViaBrevo) {
    return { provider: 'brevo' };
  }

  const deliveredViaNodemailer = await sendViaNodemailer({ to, subject, text, html, from });
  if (deliveredViaNodemailer) {
    return { provider: 'nodemailer' };
  }

  throw new Error('No se pudo enviar la notificación por correo electrónico.');
};
