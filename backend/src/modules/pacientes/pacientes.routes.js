import { Router } from 'express';

const router = Router();

// Ruta para obtener todos los pacientes
router.get('/', (req, res) => {
  // Aquí iría la lógica para obtener pacientes desde la base de datos
  res.json([{ id: 1, nombre: 'Paciente Ejemplo' }]);
});

export default router;
