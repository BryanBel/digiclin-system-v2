import { Router } from 'express';
import pool from '../../db/pool.js';

const router = Router();

/**
 * Diagnostico de configuracion.
 *
 * Una variable ausente, una mal escrita y una base inalcanzable producen el mismo
 * sintoma desde fuera: 500 en todo lo que toca datos, sin decir por que. Sin acceso a los
 * logs del proveedor no hay forma de distinguirlas, y se acaba adivinando.
 *
 * Responde booleanos y, cuando la conexion falla, el mensaje del error -- que nombra el
 * host o el fallo de red, nunca la credencial. No expone el valor, el prefijo ni la
 * longitud de ningun secreto.
 */
router.get('/', async (_req, res) => {
  const presente = (nombre) => Boolean(process.env[nombre]);

  let baseAlcanzable = false;
  let baseError = null;
  let host = null;

  try {
    host = new URL(process.env.DATABASE_URL).hostname;
  } catch {
    host = null;
  }

  try {
    const { rows } = await pool.query('select 1 as ok');
    baseAlcanzable = rows[0]?.ok === 1;
  } catch (error) {
    baseError = error.message;
  }

  res.json({
    base: {
      urlDefinida: presente('DATABASE_URL'),
      host,
      alcanzable: baseAlcanzable,
      error: baseError,
    },
    secretos: {
      acceso: presente('ACCESS_TOKEN_SECRET'),
      verificacion: presente('EMAIL_VERIFICATION_SECRET'),
    },
    correo: {
      resend: presente('RESEND_API_KEY'),
      smtp: presente('EMAIL_USER') && presente('EMAIL_PASS'),
      // Si esto sale true en produccion, ningun paciente recibe sus correos.
      desvioActivo: process.env.NODE_ENV !== 'prod' && Boolean(process.env.EMAIL_REDIRECT_TO),
    },
    urls: {
      cors: process.env.CORS_ORIGIN || null,
      backend: process.env.BACKEND_URL || null,
      frontend: process.env.FRONTEND_URL || null,
    },
    entorno: process.env.NODE_ENV ?? null,
    node: process.version,
  });
});

export default router;
