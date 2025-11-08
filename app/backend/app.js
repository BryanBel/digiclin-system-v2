import express from 'express';
import { ZodError } from 'zod';
import { ErrorWithStatus } from './src/utils/errorTypes.js';
import { DatabaseError } from 'pg';
import cors from 'cors';
import { authenticateUser } from './src/modules/auth/auth.middlewares.js';
import authRouter from './src/modules/auth/auth.routes.js';
import patientsRouter from './src/modules/patients/patients.routes.js';
import patientsPublicRouter from './src/modules/patients/patients.public.routes.js';
import medicalHistoryRouter from './src/modules/medical_history/medical_history.routes.js';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import path from 'path';
import appointmentsRouter from './src/modules/appointments/appointments.routes.js';
import usersRepository from './src/modules/users/users.repository.js';
import appointmentRequestsRouter from './src/modules/appointment_requests/appointment_requests.routes.js';

export const createAndConfigureApp = async () => {
  const app = express();

  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:4321', 'http://localhost:4320', 'http://localhost:4322'];

  app.use(cors({ credentials: true, origin: allowedOrigins }));
  app.use(express.json());
  app.use(cookieParser());

  app.use(async (req, res, next) => {
    res.locals.user = null;

    const accessToken = req.cookies.access_token;
    if (!accessToken) return next();

    try {
      const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
      const user = await usersRepository.findByEmail({ email: decodedToken.email });
      if (user) res.locals.user = user;
    } catch (error) {
      console.warn('SSR auth check failed:', error.message);
    }

    next();
  });

  // Serve static uploaded files
  app.use('/uploads', express.static(path.join(import.meta.dirname, 'public', 'uploads')));

  app.use('/api/auth', authRouter);
  app.use('/api/appointment-requests', appointmentRequestsRouter);
  app.use('/api/patients/lookup', patientsPublicRouter);
  app.use('/api/medical-history', authenticateUser, medicalHistoryRouter);
  app.use('/api/patients', authenticateUser, patientsRouter);
  app.use('/api/appointments', appointmentsRouter);

  app.use((err, req, res, _next) => {
    const sanitizePayload = (payload, depth = 0) => {
      if (!payload || typeof payload !== 'object') return payload;

      if (depth > 2) return '[truncated]';

      if (Array.isArray(payload)) {
        return payload.slice(0, 5).map((item) => sanitizePayload(item, depth + 1));
      }

      return Object.entries(payload).reduce((acc, [key, value]) => {
        const normalizedKey = key.toLowerCase();
        if (/(password|token|secret|authorization)/.test(normalizedKey)) {
          acc[key] = '[redacted]';
        } else {
          acc[key] = sanitizePayload(value, depth + 1);
        }
        return acc;
      }, {});
    };

    const errorSummary = {
      status: 500,
      message: 'Ocurrió un error inesperado. Inténtalo nuevamente más tarde.',
      details: undefined,
    };

    if (err instanceof ZodError) {
      errorSummary.status = 400;
      const validationDetails = err.issues.map((issue) => ({
        path: issue.path.join('.') || '(root)',
        message: issue.message,
        code: issue.code,
      }));
      errorSummary.details = validationDetails;
      errorSummary.message =
        validationDetails.map((detail) => detail.message).join(' | ') ||
        'La información enviada no es válida.';
    } else if (err instanceof ErrorWithStatus) {
      errorSummary.status = err.status ?? 500;
      errorSummary.message = err.message ?? errorSummary.message;
      errorSummary.details = err.details ?? undefined;
    } else if (err instanceof DatabaseError) {
      if (err.code === '22P02') {
        errorSummary.status = 400;
        errorSummary.message = 'Formato de dato no válido.';
      } else if (err.code === '23505') {
        errorSummary.status = 400;
        errorSummary.message = 'El correo ya está en uso. Por favor intenta con otro.';
        errorSummary.details = err.detail ?? undefined;
      }
    } else if (err instanceof jwt.JsonWebTokenError) {
      errorSummary.status = 401;
      errorSummary.message = 'Token inválido o expirado.';
    }

    const logPayload = {
      method: req.method,
      path: req.originalUrl,
      status: errorSummary.status,
      message: errorSummary.message,
      errorName: err.name,
    };

    if (res.locals.user?.id) logPayload.userId = res.locals.user.id;

    if (req.query && Object.keys(req.query).length > 0) {
      logPayload.query = sanitizePayload(req.query);
    }

    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      logPayload.body = sanitizePayload(req.body);
    }

    if (errorSummary.details !== undefined) {
      logPayload.details = sanitizePayload(errorSummary.details);
    }

    if (process.env.NODE_ENV !== 'prod' && err.stack) {
      const [stackHead] = err.stack.split('\n');
      logPayload.stack = stackHead.trim();
    }

    const logger = errorSummary.status === 401 ? console.info : console.error;
    const logLabel = errorSummary.status === 401 ? '[AUTH CHECK]' : '[API ERROR]';
    logger(logLabel, logPayload);

    const responsePayload = { error: errorSummary.message };
    if (errorSummary.details !== undefined) {
      responsePayload.details = errorSummary.details;
    }

    res.status(errorSummary.status).json(responsePayload);
  });

  if (process.env.NODE_ENV === 'prod') {
    const path = await import('path');
    const { handler: ssrHandler } = await import('./dist/server/entry.mjs');
    app.use(express.static(path.join(import.meta.dirname, 'dist', 'client')));
    app.use((req, res, next) => {
      return ssrHandler(req, res, next);
    });
  }

  return app;
};
