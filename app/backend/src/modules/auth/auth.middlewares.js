import { ErrorWithStatus } from '../../utils/errorTypes.js';
import jwt from 'jsonwebtoken';
import usersRepository from '../users/users.repository.js';

export const authenticateUser = async (req, res, next) => {
  try {
    // 1. Comprobar el access token
    const accessToken = req.cookies.access_token;

    if (!accessToken) {
      return next(new ErrorWithStatus(401, 'No estas autorizado para esta operacion'));
    }

    // 2. Descodificar el token
    const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    const user = await usersRepository.findByEmail({ email: decodedToken.email });
    if (!user) {
      return next(new ErrorWithStatus(401, 'No estas autorizado para esta operacion'));
    }

    // 3. Implementar el usuario en cada requerimiento de la ruta que use el middleware
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Restringe una ruta a los roles indicados.
 *
 * Se apoya en res.locals.user, que el middleware global de app.js ya completa cuando hay
 * una cookie de sesion valida. Ese middleware nunca rechaza -- solo informa quien llama --
 * asi que sin un control explicito como este la ruta queda abierta a cualquiera.
 *
 * Deja tambien req.user poblado, porque parte de los modulos leen esa propiedad y la otra
 * parte lee res.locals.user; tener las dos evita que el control dependa de cual se use.
 */
export const requireRole =
  (...allowedRoles) =>
  (req, res, next) => {
    const user = res.locals.user;

    if (!user) {
      return next(new ErrorWithStatus(401, 'No estas autorizado para esta operacion'));
    }

    const role = typeof user.role === 'string' ? user.role.toLowerCase() : '';
    const allowed = allowedRoles.map((item) => item.toLowerCase());

    if (!allowed.includes(role)) {
      return next(new ErrorWithStatus(403, 'Acceso restringido para este recurso.'));
    }

    req.user = user;
    next();
  };

/** Personal de la clinica: quien puede ver y mover la agenda de cualquier paciente. */
export const requireStaff = requireRole('admin', 'doctor');
