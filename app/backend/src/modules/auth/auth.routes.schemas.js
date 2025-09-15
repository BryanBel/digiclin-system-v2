import { z } from 'zod/v4';

export const loginUserRouteSchema = {
  params: z.object({}),
  body: z.object({
    email: z.string(),
    password: z.string(),
  }),
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
