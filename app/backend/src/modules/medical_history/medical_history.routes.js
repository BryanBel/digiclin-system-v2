import { Router } from 'express';
import {
  getAllMedicalHistory,
  getMedicalHistoryById,
  createMedicalHistory,
  updateMedicalHistory,
  deleteMedicalHistory,
  getMedicalHistoryByPatientId,
} from './medical_history.repository.js';

const router = Router();

// Obtener todo el historial médico
router.get('/', async (req, res, next) => {
  try {
    const history = await getAllMedicalHistory();
    res.json(history);
  } catch (error) {
    next(error);
  }
});

// Obtener historial médico por ID de paciente
router.get('/patient/:patientId', async (req, res, next) => {
  try {
    const history = await getMedicalHistoryByPatientId(req.params.patientId);
    res.json(history);
  } catch (error) {
    next(error);
  }
});

// Obtener historial médico por ID
router.get('/:id', async (req, res, next) => {
  try {
    const record = await getMedicalHistoryById(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    res.json(record);
  } catch (error) {
    next(error);
  }
});

// Crear historial médico
router.post('/', async (req, res, next) => {
  try {
    // El frontend envía { description, patient_id }
    const { description, patient_id } = req.body;

    // Defensive check: Ensure user is authenticated and attached to the request
    if (!req.user || !req.user.id) {
      // This prevents a crash if the authentication middleware fails to attach the user.
      return res.status(401).json({ error: 'Usuario no autenticado o sesión inválida.' });
    }
    // El ID del doctor lo obtenemos del usuario autenticado por el middleware
    const doctor_id = req.user.id;

    // Construimos el objeto que espera la función del repositorio
    const newEntryData = {
      medical_inform: description, // Mapeamos 'description' a 'medical_inform'
      patient_id,
      doctor_id,
    };

    const nuevoRecord = await createMedicalHistory(newEntryData);
    res.status(201).json(nuevoRecord);
  } catch (error) {
    next(error);
  }
});

// Actualizar historial médico
router.put('/:id', async (req, res, next) => {
  try {
    const recordActualizado = await updateMedicalHistory(req.params.id, req.body);
    if (!recordActualizado) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    res.json(recordActualizado);
  } catch (error) {
    next(error);
  }
});

// Eliminar historial médico
router.delete('/:id', async (req, res, next) => {
  try {
    await deleteMedicalHistory(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;