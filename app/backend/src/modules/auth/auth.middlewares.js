import { ErrorWithStatus } from '../../utils/errorTypes.js';
import jwt from 'jsonwebtoken';
import usersRepository from '../users/users.repository.js';

export const authenticateUser = async (req, res, next) => {
  // 1. Comprobar el access token
  const accessToken = req.cookies.access_token;

  if (!accessToken) {
    throw new ErrorWithStatus(401, 'No estas autorizado para esta operacion');
  }

  // 2. Descodificar el token
  const decodedToken = jwt.verify(accessToken, process.env.REFRESH_TOKEN_SECRET);
  const user = await usersRepository.findByEmail({ email: decodedToken.email });
  if (!user) {
    throw new ErrorWithStatus(401, 'No estas autorizado para esta operacion');
  }

  // 3. Implementar el usuario en cada requerimiento de la ruta que use el middleware
  req.user = user;
  next();
};
