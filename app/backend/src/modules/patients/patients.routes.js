import { Router } from 'express';
import {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
} from './patients.repository.js';

const router = Router();


// Get all patients
router.get('/', async (req, res) => {
  try {
    const patients = await getAllPatients();
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: 'Error getting patients' });
  }
});

// Get patient by ID
router.get('/:id', async (req, res) => {
  try {
    const patient = await getPatientById(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: 'Error getting patient' });
  }
});

// Create patient
router.post('/', async (req, res) => {
  try {
    const newPatient = await createPatient(req.body);
    res.status(201).json(newPatient);
  } catch (error) {
    res.status(500).json({ error: 'Error creating patient' });
  }
});

// Update patient
router.put('/:id', async (req, res) => {
  try {
    const updatedPatient = await updatePatient(req.params.id, req.body);
    if (!updatedPatient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(updatedPatient);
  } catch (error) {
    res.status(500).json({ error: 'Error updating patient' });
  }
});

// Delete patient
router.delete('/:id', async (req, res) => {
  try {
    await deletePatient(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Error deleting patient' });
  }
});

export default router;
