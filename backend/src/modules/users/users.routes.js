const express = require('express');
const router = express.Router();

// Obtener todos los usuarios (doctores)
router.get('/', (req, res) => {
  // lógica para obtener usuarios (doctores)
  res.json([]);
});

// Puedes agregar más rutas (crear, editar, eliminar)
module.exports = router;
