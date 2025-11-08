import { Router } from 'express';
import { z } from 'zod';
import { findPatientByDocumentOrEmail } from './patients.repository.js';
import { mapPatientProfile } from './patients.mappers.js';

const router = Router();

const lookupPatientSchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
    z.string().email(),
  ),
});

router.get('/', async (req, res, next) => {
  try {
    const { email } = lookupPatientSchema.parse(req.query);
    const patient = await findPatientByDocumentOrEmail({ email });

    if (!patient) {
      return res.status(404).json({ error: 'No encontramos un paciente con ese correo.' });
    }

    res.json({ patient: mapPatientProfile(patient) });
  } catch (error) {
    next(error);
  }
});

export default router;
