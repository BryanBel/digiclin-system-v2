import { z } from 'zod/v4';

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{6,}$/;

export const createUserRouteSchema = {
  params: z.object({}),
  body: z.object({
    email: z.email('Tiene que ser un email valido'),
    password: z
      .string()
      .regex(
        PASSWORD_REGEX,
        'Debe tener al menos 6 caracteres e incluir una letra, un número y un carácter especial (!@#$%^&*).',
      ),
  }),
  queries: z.object({}),
};

export const verifyUserRouteSchema = {
  params: z.object({}),
  body: z.object({
    token: z.jwt('Tiene que ser un token valido'),
  }),
  queries: z.object({}),
};
