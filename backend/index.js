const express = require('express');
const dotenv = require('dotenv'); // ¡Necesario para dotenv.config()!
const cors = require('cors');     // ¡Necesario para app.use(cors())!
const { Pool } = require('pg');   // ¡Nuevo! Para la base de datos

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Backend de ClinKlank funcionando y listo para más!');
  });

app.get('/api/check-db', async (req, res) => {
  // === INICIO DEL CÓDIGO QUE DEBES PEGAR AQUÍ ===
  try {
    // Aquí usamos 'pool' que ya fue declarado e inicializado arriba
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({
      status: 'success',
      message: 'Conexión a la base de datos de Supabase funcionando correctamente.',
      databaseTime: result.rows[0].current_time
    });
  } catch (error) {
    console.error('Error al verificar la conexión a la base de datos:', error);
    res.status(500).json({
      status: 'error',
      message: 'No se pudo conectar o consultar la base de datos.',
      details: error.message // Muestra el mensaje de error para depuración
    });
  }
  // === FIN DEL CÓDIGO QUE DEBES PEGAR AQUÍ ===
});


pool.connect((err, client, done) => {
  // === INICIO DEL CÓDIGO QUE DEBES PEGAR AQUÍ ===
  if (err) {
    console.error('❌ Error fatal al conectar a la base de datos de Supabase:', err.stack);
    // Si la DB es crucial para que el servidor funcione, puedes considerar salir
    // process.exit(1);
    return;
  }
  console.log('✅ Conectado exitosamente a la base de datos de Supabase!');
  client.release(); // Libera el cliente de vuelta al pool
  done();
  // === FIN DEL CÓDIGO QUE DEBES PEGAR AQUÍ ===
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});