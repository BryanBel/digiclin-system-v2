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
router.get('/', async (req, res) => {
  try {
    const history = await getAllMedicalHistory();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial médico' });
  }
});

// Obtener historial médico por ID
router.get('/:id', async (req, res) => {
  try {
    const record = await getMedicalHistoryById(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener registro' });
  }
});

// Crear historial médico
router.post('/', async (req, res) => {
  try {
    const nuevoRecord = await createMedicalHistory(req.body);
    res.status(201).json(nuevoRecord);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear registro' });
  }
});

// Actualizar historial médico
router.put('/:id', async (req, res) => {
  try {
    const recordActualizado = await updateMedicalHistory(req.params.id, req.body);
    if (!recordActualizado) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    res.json(recordActualizado);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar registro' });
  }
});

// Eliminar historial médico
router.delete('/:id', async (req, res) => {
  try {
    await deleteMedicalHistory(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar registro' });
  }
});

router.get('/patient/:patientId', async (req, res) => {
  try {
    const history = await getMedicalHistoryByPatientId(req.params.patientId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial médico por paciente' });
  }
});

export default router;
