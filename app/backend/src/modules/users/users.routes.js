import { Router } from 'express';
import {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} from './users.repository.js';

const router = Router();

// Obtener todos los doctores
router.get('/', async (req, res) => {
  try {
    const doctors = await getAllDoctors();
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener doctores' });
  }
});

// Obtener un doctor por ID
router.get('/:id', async (req, res) => {
  try {
    const doctor = await getDoctorById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor no encontrado' });
    }
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener doctor' });
  }
});

// Crear un doctor
router.post('/', async (req, res) => {
  try {
    const nuevoDoctor = await createDoctor(req.body);
    res.status(201).json(nuevoDoctor);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear doctor' });
  }
});

// Actualizar un doctor
router.put('/:id', async (req, res) => {
  try {
    const doctorActualizado = await updateDoctor(req.params.id, req.body);
    if (!doctorActualizado) {
      return res.status(404).json({ error: 'Doctor no encontrado' });
    }
    res.json(doctorActualizado);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar doctor' });
  }
});

// Eliminar un doctor
router.delete('/:id', async (req, res) => {
  try {
    await deleteDoctor(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar doctor' });
  }
});

export default router;
