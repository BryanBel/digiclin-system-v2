import { Resend } from 'resend';

/**
 * Cliente de Resend, creado bajo demanda.
 *
 * El constructor de Resend lanza si no recibe una clave, y este modulo se construia al
 * importarse. Como emailDispatcher lo importa siempre, el proceso entero moria al
 * arrancar sin RESEND_API_KEY -- incluidos los scripts de tablas y semilla, que no envian
 * un solo correo. Tambien hacia inalcanzable el respaldo por SMTP, que si estaba bien
 * escrito: la comprobacion de la clave vive en el dispatcher, pero nunca llegaba a
 * ejecutarse.
 *
 * Creandolo aqui dentro, la falta de clave solo importa en el momento de enviar, y el
 * dispatcher puede decidir usar SMTP en su lugar.
 */
let client = null;

export const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  if (!client) client = new Resend(apiKey);
  return client;
};

export default getResendClient;
