import { Router } from 'express';
import {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
} from './patients.repository.js';
import { createPatientSchema, updatePatientSchema } from './patients.routes.schemas.js';

const router = Router();

// Get all patients
router.get('/', async (req, res, next) => {
  try {
    const patients = await getAllPatients();
    res.json(patients);
  } catch (error) {
    next(error);
  }
});

// Get patient by ID
router.get('/:id', async (req, res, next) => {
  try {
    const patient = await getPatientById(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    next(error);
  }
});

// Create patient
router.post('/', async (req, res, next) => {
  try {
    const patientData = createPatientSchema.body.parse(req.body);
    const newPatient = await createPatient(patientData);
    res.status(201).json(newPatient);
  } catch (error) {
    next(error);
  }
});

// Update patient
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = updatePatientSchema.params.parse(req.params);
    const patientData = updatePatientSchema.body.parse(req.body);
    const updatedPatient = await updatePatient(id, patientData);
    if (!updatedPatient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(updatedPatient);
  } catch (error) {
    next(error);
  }
});

// Delete patient
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await deletePatient(id);
    res.json({ id });
  } catch (error) {
    next(error);
  }
});

export default router;
