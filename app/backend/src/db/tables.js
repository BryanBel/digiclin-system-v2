import pool from './pool.js';

const createAllTables = async () => {
  const dropQueries = [
    'DROP TABLE IF EXISTS attachments CASCADE',
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
      phone TEXT,
      cedula TEXT
    )`,
    `CREATE TABLE medical_history (
      id SERIAL PRIMARY KEY,
      entry_date TIMESTAMPTZ DEFAULT NOW(),
      medical_inform TEXT NOT NULL,
      treatment TEXT,
      recipe TEXT,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id UUID REFERENCES users(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE attachments (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      mimetype TEXT NOT NULL,
      medical_history_id INTEGER NOT NULL REFERENCES medical_history(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW()
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
