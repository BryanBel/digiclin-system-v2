import resend from './resend.js';
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

  const forcedInbox = process.env.RESEND_TEST_RECIPIENT?.trim() || 'bryanbelandriav@gmail.com';
  const requestedRecipients = toArray(to);
  const forcedRecipients = forcedInbox ? [forcedInbox] : requestedRecipients;

  // Remove the overrides tied to forcedInbox once Resend accepts all domains.
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

  const message = buildMessage({ to, subject, text, html, from });

  try {
    await resend.emails.send(message);
    return true;
  } catch (error) {
    console.error('[EMAIL][RESEND_FAIL]', error);
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

  const deliveredViaNodemailer = await sendViaNodemailer({ to, subject, text, html, from });
  if (deliveredViaNodemailer) {
    return { provider: 'nodemailer' };
  }

  throw new Error('No se pudo enviar la notificación por correo electrónico.');
};
