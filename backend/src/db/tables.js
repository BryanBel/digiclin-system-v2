import db from './index.js';

const createUsersTable = async () => {
  await db.query('DROP TABLE IF EXISTS users CASCADE');
  await db.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      email_verified BOOLEAN DEFAULT false,
      role TEXT NOT NULL DEFAULT 'doctor'
    )
  `);
  console.log('Tabla de usuarios creada');
};

const createPatientsTable = async () => {
  await db.query('DROP TABLE IF EXISTS patients CASCADE');
  await db.query(`
    CREATE TABLE patients (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      cedula TEXT NOT NULL
    )
  `);
  console.log('Tabla de pacientes creada');
};

const createMedicalHistoryTable = async () => {
  await db.query('DROP TABLE IF EXISTS medical_history CASCADE');
  await db.query(`
    create table MEDICAL_HISTORY (
      id SERIAL PRIMARY KEY,
      date TIMESTAMPTZ DEFAULT NOW(),
      medical_inform TEXT NOT NULL,
      treatment TEXT NOT NULL,
      recipe TEXT NOT NUll,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL
  )
  `);
  console.log('Tabla de historial medico creado');
};

const createTables = async () => {
  await createUsersTable();
  await createPatientsTable();
  await createMedicalHistoryTable();
  console.log('Tablas creadas correctamente');
  process.exit();
};

createTables();
