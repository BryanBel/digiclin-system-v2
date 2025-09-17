import pool from './pool.js';

const createAllTables = async () => {
  const dropQueries = [
    'DROP TABLE IF EXISTS medical_history CASCADE',
    'DROP TABLE IF EXISTS patients CASCADE',
    'DROP TABLE IF EXISTS users CASCADE',
  ];

  const createQueries = [
    `CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      passwordhash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      verify_email BOOLEAN DEFAULT false NOT NULL
    )`,
    `CREATE TABLE patients (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      cedula TEXT NOT NULL
    )`,
    `CREATE TABLE medical_history (
      id SERIAL PRIMARY KEY,
      date TIMESTAMPTZ DEFAULT NOW(),
      medical_inform TEXT NOT NULL,
      treatment TEXT NOT NULL,
      recipe TEXT NOT NULL,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id UUID REFERENCES users(id) ON DELETE SET NULL
    )`,
  ];

  try {
    console.log('Dropping existing tables...');
    for (const query of dropQueries) {
      await pool.query(query);
    }

    console.log('Creating new tables...');
    for (const query of createQueries) {
      await pool.query(query);
    }

    console.log('All tables created successfully.');
  } catch (err) {
    console.error('Error during table creation:', err);
  } finally {
    await pool.end();
    console.log('Database pool closed.');
  }
};

createAllTables();
