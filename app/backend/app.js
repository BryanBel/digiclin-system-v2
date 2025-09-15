import express from 'express';
import { ZodError } from 'zod/v4';
import { ErrorWithStatus } from './src/utils/errorTypes.js';
import { DatabaseError } from 'pg';
import cors from 'cors';
import usersRouter from './src/modules/users/users.routes.js';
import patientsRouter from './src/modules/patients/patients.routes.js';
import medicalHistoryRouter from './src/modules/medical_history/medical_history.routes.js';
import path from 'path';
import { handler as ssrHandler } from './dist/server/entry.mjs';

const app = express();

app.use(cors());
app.use(express.json());

//se agrega /api/
app.use('/api/users', usersRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/users', usersRouter);
app.use('/api/medical-history', medicalHistoryRouter);

app.use('/', express.static(path.join(import.meta.dirname, 'dist', 'client')));
app.use(ssrHandler);

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
  }

  res.json({ erorr: 'HUBO UN ERROR' });
});

export default app;
