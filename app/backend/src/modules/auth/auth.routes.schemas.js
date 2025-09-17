import { z } from 'zod/v4';

export const loginUserRouteSchema = {
  params: z.object({}),
  body: z.object({
    email: z.string(),
    password: z.string(),
  }),
  queries: z.object({}),
};

export const registerUserRouteSchema = {
  params: z.object({}),
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  }),
  queries: z.object({}),
};

export const verifyEmailRouteSchema = {
  params: z.object({
    token: z.string(),
  }),
  body: z.object({}),
  queries: z.object({}),
};

export const getLoggedUserRouteSchema = {
  params: z.object({}),
  body: z.object({}),
  queries: z.object({}),
};

export const logOutUserRouteSchema = {
  params: z.object({}),
  body: z.object({}),
  queries: z.object({}),
};
