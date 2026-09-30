/**
 * Mensajes en espanol para los codigos de error de Better Auth (extraidos del paquete 1.7.6)
 * y para las respuestas de la API. Nunca se muestra un error en ingles al usuario.
 */
const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Correo o contraseña incorrectos.',
  INVALID_EMAIL: 'Escribe un correo válido.',
  INVALID_PASSWORD: 'Contraseña incorrecta.',
  EMAIL_NOT_VERIFIED: 'Confirma tu correo antes de entrar. Revisa tu bandeja de entrada.',
  PASSWORD_TOO_SHORT: 'La contraseña debe tener al menos 12 caracteres.',
  PASSWORD_TOO_LONG: 'La contraseña no puede superar los 128 caracteres.',
  PASSWORD_COMPROMISED: 'Esta contraseña aparece en filtraciones conocidas. Elige otra.',
  INVALID_TOKEN: 'El enlace no es válido o ya se usó. Pide uno nuevo.',
  TOKEN_EXPIRED: 'El enlace venció. Pide uno nuevo.',
  EMAIL_ALREADY_VERIFIED: 'Tu correo ya estaba confirmado. Ya puedes entrar.',
  SESSION_EXPIRED: 'Tu sesión venció. Vuelve a entrar.',
  SESSION_NOT_FRESH: 'Por seguridad, vuelve a entrar antes de hacer este cambio.',
  CREDENTIAL_ACCOUNT_NOT_FOUND: 'Esta cuenta aún no tiene contraseña. Usa "Olvidé mi contraseña".',
  // Verificacion en dos pasos
  INVALID_CODE: 'El código no es correcto. Revisa la hora de tu teléfono e inténtalo de nuevo.',
  INVALID_BACKUP_CODE: 'El código de respaldo no es válido o ya se usó.',
  INVALID_TWO_FACTOR_COOKIE: 'El paso de verificación venció. Vuelve a entrar.',
  ACCOUNT_TEMPORARILY_LOCKED: 'Demasiados intentos fallidos. Espera unos minutos.',
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: 'Demasiados intentos. Vuelve a entrar para empezar de nuevo.',
  TOTP_ALREADY_ENABLED: 'La verificación en dos pasos ya está activada.',
  TWO_FACTOR_NOT_ENABLED: 'La verificación en dos pasos no está activada.',
  // Clinica e invitaciones
  INVITATION_NOT_FOUND: 'La invitación no existe, venció o fue cancelada.',
  YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION:
    'Esta invitación es para otro correo. Entra con la cuenta a la que se envió.',
  EMAIL_VERIFICATION_REQUIRED_BEFORE_ACCEPTING_OR_REJECTING_INVITATION:
    'Confirma tu correo antes de responder la invitación.',
  USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION: 'Esa persona ya es miembro de la clínica.',
  USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION: 'Esa persona ya tiene una invitación pendiente.',
  YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION:
    'No tienes permiso para invitar en esta clínica.',
  YOU_ARE_NOT_ALLOWED_TO_INVITE_USER_WITH_THIS_ROLE: 'No puedes invitar con ese rol.',
  YOU_ARE_NOT_ALLOWED_TO_CANCEL_THIS_INVITATION: 'No puedes cancelar esta invitación.',
  YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_MEMBER: 'Solo el dueño puede cambiar roles.',
  YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER: 'Solo el dueño puede retirar miembros.',
};

const GENERIC = 'Ocurrió un error inesperado. Inténtalo de nuevo.';

export interface ErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

/**
 * Mensaje para mostrar. Los codigos conocidos se traducen; los errores sin codigo vienen de
 * nuestra API o de nuestros hooks, que ya responden en espanol.
 */
export function errorMessage(error: ErrorLike | null | undefined): string {
  if (!error) return GENERIC;
  if (error.status === 429) return 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.';
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code]!;
  if (!error.code && error.message) return error.message;
  return GENERIC;
}
