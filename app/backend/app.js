import express from 'express';
import { ZodError } from 'zod';
import { ErrorWithStatus } from './src/utils/errorTypes.js';
import { DatabaseError } from 'pg';
import cors from 'cors';
import { authenticateUser } from './src/modules/auth/auth.middlewares.js';
import authRouter from './src/modules/auth/auth.routes.js';
import patientsRouter from './src/modules/patients/patients.routes.js';
import medicalHistoryRouter from './src/modules/medical_history/medical_history.routes.js';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import path from 'path';

export const createAndConfigureApp = async () => {
  const app = express();

  const origin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : 'http://localhost:4321';

  app.use(cors({ credentials: true, origin }));
  app.use(express.json());
  app.use(cookieParser());

  // Serve static uploaded files
  app.use('/uploads', express.static(path.join(import.meta.dirname, 'public', 'uploads')));

  //se agrega /api/
  app.use('/api/auth', authRouter);
  app.use('/api/medical-history', authenticateUser, medicalHistoryRouter);
  app.use('/api/patients', authenticateUser, patientsRouter);

  app.use((err, req, res, _next) => {
    console.log(err);

    if (err instanceof ZodError) {
      const messages = err.issues.map((zodError) => zodError.message);
      const message = messages.join(',\n');
      return res.status(400).json({ error: message });
    }

    if (err instanceof ErrorWithStatus) {
      return res.status(err.status).json({ error: err.message });
    }

    if (err instanceof DatabaseError) {
      if (err.code === '22P02') {
        return res.status(400).json({ error: 'Hubo un error. Contacte al administrador' });
      }
      if (err.code === '23505') {
        return res
          .status(400)
          .json({ error: 'El correo ya esta en uso. Por favor intente con otro.' });
      }
    }

    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Token inválido o expirado.' });
    }

    res.status(500).json({ error: 'HUBO UN ERROR' });
  });

  if (process.env.NODE_ENV === 'prod') {
    const path = await import('path');
    const { handler: ssrHandler } = await import('./dist/server/entry.mjs');
    app.use(express.static(path.join(import.meta.dirname, 'dist', 'client')));
    app.use(ssrHandler);
  }

  return app;
};
