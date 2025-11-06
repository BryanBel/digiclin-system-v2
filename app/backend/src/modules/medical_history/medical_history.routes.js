import { Router } from 'express';
import {
  listMedicalHistoryEntries,
  findMedicalHistoryById,
  createMedicalHistoryEntry,
} from './medical_history.repository.js';
import {
  listMedicalHistorySchema,
  createMedicalHistorySchema,
} from './medical_history.routes.schemas.js';
import { parseDateInput } from '../../utils/dateHelpers.js';

const router = Router();

const mapMedicalHistory = (row) => {
  if (!row) return null;

  const entryDateIso = row.entry_date instanceof Date ? row.entry_date.toISOString() : null;

  return {
    id: row.id,
    entryDate: entryDateIso,
    medicalInform: row.medical_inform,
    treatment: row.treatment ?? null,
    recipe: row.recipe ?? null,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    visitId: row.visit_id,
    patient: row.patient_id
      ? {
          id: row.patient_id,
          name: row.patient_name ?? null,
          documentId: row.patient_document_id ?? null,
          email: row.patient_email ?? null,
          phone: row.patient_phone ?? null,
        }
      : null,
    doctor: row.doctor_id
      ? {
          id: row.doctor_id,
          name: row.doctor_name ?? null,
          email: row.doctor_email ?? null,
        }
      : null,
  };
};

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

    const query = listMedicalHistorySchema.parse(req.query);
    const entries = await listMedicalHistoryEntries(query);
    res.json({ entries: entries.map(mapMedicalHistory) });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!ensureRole(req, res, ['admin', 'doctor'])) return;

    const entryId = Number(req.params.id);
    if (Number.isNaN(entryId)) {
      return res.status(400).json({ error: 'Identificador inválido.' });
    }

    const entry = await findMedicalHistoryById({ id: entryId });
    if (!entry) {
      return res.status(404).json({ error: 'Historial médico no encontrado.' });
    }

    res.json({ entry: mapMedicalHistory(entry) });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    if (!ensureRole(req, res, ['doctor'])) return;

    const payload = createMedicalHistorySchema.parse(req.body);

    const entryDate = payload.entryDate ? parseDateInput(payload.entryDate) : null;
    if (payload.entryDate && !entryDate) {
      return res.status(400).json({ error: 'Fecha inválida.' });
    }

    const created = await createMedicalHistoryEntry({
      entryDate,
      medicalInform: payload.medicalInform,
      treatment: payload.treatment,
      recipe: payload.recipe,
      patientId: payload.patientId,
      doctorId: req.user?.id,
      visitId: payload.visitId,
    });

    if (!created) {
      return res.status(500).json({ error: 'No se pudo crear el historial médico.' });
    }

    res.status(201).json({ entry: mapMedicalHistory(created) });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', (req, res) => {
  if (!ensureRole(req, res, ['doctor'])) return;
  return res.status(405).json({
    error:
      'Los registros del historial son inmutables. Crea un nuevo registro para añadir información.',
  });
});

router.delete('/:id', (req, res) => {
  if (!ensureRole(req, res, ['doctor'])) return;
  return res.status(405).json({
    error:
      'Los registros del historial no pueden eliminarse para preservar la trazabilidad clínica.',
  });
});

export default router;
