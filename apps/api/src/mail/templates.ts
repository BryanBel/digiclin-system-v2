import type { MailMessage } from './mailer.js';

type Recipient = MailMessage['to'];

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Todo dato que viene de un usuario (nombres, motivos) se escapa antes de ir al HTML. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]!);
}

function layout(title: string, paragraphs: string[], action?: { label: string; url: string }) {
  const body = paragraphs.map((html) => `<p style="margin:0 0 16px">${html}</p>`).join('');
  const button = action
    ? `<p style="margin:24px 0"><a href="${escapeHtml(action.url)}" style="background:#171717;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">${escapeHtml(action.label)}</a></p>
       <p style="margin:0 0 16px;font-size:13px;color:#555">Si el botón no funciona, copia este enlace en tu navegador:<br>${escapeHtml(action.url)}</p>`
    : '';
  return `<!doctype html><html lang="es"><body style="font-family:system-ui,sans-serif;color:#171717;max-width:560px;margin:0 auto;padding:24px">
<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(title)}</h1>${body}${button}
<p style="margin:32px 0 0;font-size:12px;color:#777">DigiClin · Este es un mensaje automático; no respondas a este correo.</p>
</body></html>`;
}

function message(
  to: Recipient,
  subject: string,
  paragraphs: { html: string; text: string }[],
  action?: { label: string; url: string },
): MailMessage {
  const text = [
    ...paragraphs.map((paragraph) => paragraph.text),
    ...(action ? [`${action.label}: ${action.url}`] : []),
  ].join('\n\n');
  return {
    to,
    subject,
    html: layout(
      subject,
      paragraphs.map((paragraph) => paragraph.html),
      action,
    ),
    text,
  };
}

/** Parrafo con datos del usuario: escapado en HTML, literal en texto plano. */
function p(strings: TemplateStringsArray, ...values: string[]) {
  const build = (encode: (v: string) => string) =>
    strings.reduce(
      (acc, part, i) => acc + part + (i < values.length ? encode(values[i]!) : ''),
      '',
    );
  return { html: build(escapeHtml), text: build((v) => v) };
}

const greeting = (name?: string) => (name ? p`Hola, ${name}:` : p`Hola:`);

export const ROLE_LABELS: Record<string, string> = {
  owner: 'dueño',
  admin: 'socio directivo',
  doctor: 'médico',
};

export const mailTemplates = {
  verifyEmail: (to: Recipient, url: string) =>
    message(
      to,
      'Confirma tu correo en DigiClin',
      [
        greeting(to.name),
        p`Para activar tu cuenta, confirma que este correo es tuyo. El enlace vence en 24 horas.`,
      ],
      { label: 'Confirmar correo', url },
    ),

  /** Alguien intento registrarse con un correo que ya tiene cuenta (la web no lo revela). */
  existingAccount: (to: Recipient, urls: { signIn: string; reset: string }) =>
    message(to, 'Intento de registro con tu correo en DigiClin', [
      greeting(to.name),
      p`Alguien intentó crear una cuenta nueva con este correo, pero ya tienes una.`,
      p`Si fuiste tú, entra con tu contraseña: ${urls.signIn}`,
      p`Si no la recuerdas, puedes elegir una nueva: ${urls.reset}`,
      p`Si no fuiste tú, ignora este correo: nadie tuvo acceso a tu cuenta.`,
    ]),

  resetPassword: (to: Recipient, url: string) =>
    message(
      to,
      'Restablece tu contraseña de DigiClin',
      [
        greeting(to.name),
        p`Recibimos una solicitud para cambiar tu contraseña. El enlace vence en 1 hora.`,
        p`Si no fuiste tú, ignora este correo: tu contraseña actual sigue funcionando.`,
      ],
      { label: 'Elegir una contraseña nueva', url },
    ),

  invitation: (
    to: Recipient,
    data: { clinicName: string; inviterName: string; role: string; url: string },
  ) =>
    message(
      to,
      `Invitación a ${data.clinicName} en DigiClin`,
      [
        greeting(),
        p`${data.inviterName} te invitó a unirte a ${data.clinicName} como ${ROLE_LABELS[data.role] ?? data.role}.`,
        p`Si aún no tienes cuenta, podrás crearla con este mismo correo. La invitación vence en 7 días.`,
      ],
      { label: 'Ver invitación', url: data.url },
    ),

  practitionerApproved: (to: Recipient, data: { clinicName: string; url: string }) =>
    message(
      to,
      `Tu acceso como médico en ${data.clinicName} fue aprobado`,
      [
        greeting(to.name),
        p`${data.clinicName} aprobó tu solicitud. Ya puedes entrar al portal médico.`,
      ],
      { label: 'Entrar al portal médico', url: data.url },
    ),

  practitionerRejected: (to: Recipient, data: { clinicName: string; reason: string }) =>
    message(to, `Sobre tu solicitud como médico en ${data.clinicName}`, [
      greeting(to.name),
      p`${data.clinicName} no aprobó tu solicitud por el siguiente motivo:`,
      p`${data.reason}`,
      p`Puedes corregir tus datos profesionales y volver a enviarla desde tu perfil.`,
    ]),
};
