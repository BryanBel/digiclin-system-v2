import { Router } from 'express';
import { z } from 'zod';
import { findPatientById, listPatients, updatePatient } from './patients.repository.js';
import { calculateAge, parseDateInput } from '../../utils/dateHelpers.js';

const router = Router();

const listPatientsSchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

const updatePatientSchema = z
  .object({
    fullName: z.string().min(1).max(255).optional(),
    phone: z.string().min(6).max(32).optional(),
    email: z.string().email().optional(),
    documentId: z.string().min(3).max(64).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    birthDate: z
      .string()
      .refine((value) => !value || !Number.isNaN(Date.parse(value)), 'Fecha de nacimiento inválida')
      .optional(),
    age: z.coerce.number().int().min(0).max(130).optional(),
  })
  .refine(
    (data) => {
      return (
        data.fullName ||
        data.phone ||
        data.email ||
        data.documentId ||
        data.gender ||
        data.birthDate ||
        typeof data.age === 'number'
      );
    },
    {
      message: 'Proporciona al menos un campo para actualizar.',
      path: ['fullName'],
    },
  );

const ensureRole = (req, res, allowedRoles) => {
  const userRole = typeof req.user?.role === 'string' ? req.user.role.toLowerCase() : '';
  const normalizedAllowedRoles = allowedRoles.map((role) => role.toLowerCase());

  if (!userRole || !normalizedAllowedRoles.includes(userRole)) {
    res.status(403).json({ error: 'Acceso restringido para este recurso.' });
    return false;
  }
  return true;
};

router.get('/', async (req, res, next) => {
  try {
    if (!ensureRole(req, res, ['admin', 'doctor'])) return;

    const query = listPatientsSchema.parse(req.query);
    const patients = await listPatients(query);
    res.json({ patients });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!ensureRole(req, res, ['admin', 'doctor'])) return;

    const patientId = Number(req.params.id);
    if (Number.isNaN(patientId)) {
      return res.status(400).json({ error: 'Identificador inválido.' });
    }

    const patient = await findPatientById({ id: patientId });
    if (!patient) {
      return res.status(404).json({ error: 'Paciente no encontrado.' });
    }

    res.json({ patient });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    if (!ensureRole(req, res, ['admin'])) return;

    const patientId = Number(req.params.id);
    if (Number.isNaN(patientId)) {
      return res.status(400).json({ error: 'Identificador inválido.' });
    }

    const payload = updatePatientSchema.parse(req.body);

    const birthDate = payload.birthDate ? parseDateInput(payload.birthDate) : undefined;
    let age;
    if (typeof payload.age === 'number') {
      age = payload.age;
    } else if (birthDate) {
      age = calculateAge(birthDate);
    }

    const updated = await updatePatient(
      {
        id: patientId,
        fullName: payload.fullName,
        phone: payload.phone,
        email: payload.email,
        documentId: payload.documentId,
        gender: payload.gender,
        birthDate,
        age,
      },
      null,
    );

    if (!updated) {
      return res.status(404).json({ error: 'Paciente no encontrado.' });
    }

    res.json({ patient: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
