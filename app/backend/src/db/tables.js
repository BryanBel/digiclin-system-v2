import pool from './pool.js';

const dropStatements = [
  'DROP TABLE IF EXISTS attachments CASCADE',
  'DROP TABLE IF EXISTS medical_history CASCADE',
  'DROP TABLE IF EXISTS emergency_intake CASCADE',
  'DROP TABLE IF EXISTS visits CASCADE',
  'DROP TABLE IF EXISTS appointments CASCADE',
  'DROP TABLE IF EXISTS appointment_requests CASCADE',
  'DROP TABLE IF EXISTS patients CASCADE',
  'DROP TABLE IF EXISTS users CASCADE',
  'DROP TYPE IF EXISTS appointment_priority',
  'DROP TYPE IF EXISTS appointment_channel',
  'DROP TYPE IF EXISTS appointment_status',
];

const createStatements = [
  'CREATE EXTENSION IF NOT EXISTS "pgcrypto"',
  "CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed')",
  "CREATE TYPE appointment_channel AS ENUM ('public', 'portal', 'admin')",
  "CREATE TYPE appointment_priority AS ENUM ('routine', 'priority', 'emergency')",
  `CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT,
    email VARCHAR(255) NOT NULL UNIQUE,
    passwordhash VARCHAR(255) NOT NULL,
    role TEXT NOT NULL DEFAULT 'doctor',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    verify_email BOOLEAN DEFAULT false NOT NULL
  )`,
  `CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    document_id TEXT UNIQUE,
    birth_date DATE,
    gender TEXT,
    age INTEGER,
    preferred_channel TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::JSONB
  )`,
  `CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE DEFAULT gen_random_uuid(),
    patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
    doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    reason TEXT,
    additional_notes TEXT,
    channel appointment_channel NOT NULL DEFAULT 'public',
    priority appointment_priority NOT NULL DEFAULT 'routine',
    status appointment_status NOT NULL DEFAULT 'pending',
    confirmation_token TEXT,
    token_expires_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by_user UUID REFERENCES users(id) ON DELETE SET NULL,
    intake_payload JSONB DEFAULT '{}'::JSONB,
    legacy_name TEXT,
    legacy_phone TEXT
  )`,
  `CREATE TABLE appointment_requests (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    document_id TEXT,
    birth_date DATE,
    gender TEXT,
    age INTEGER,
    symptoms TEXT,
    preferred_date TIMESTAMPTZ,
    preferred_time_range TEXT,
    is_existing_patient BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending',
    link_token TEXT,
    token_expires_at TIMESTAMPTZ,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
    admin_note TEXT,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE emergency_intake (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    severity_level TEXT,
    reported_symptoms TEXT,
    incident_location TEXT,
    transport_mode TEXT,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE visits (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE DEFAULT gen_random_uuid(),
    appointment_id INTEGER UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    chief_complaint TEXT,
    subjective_notes TEXT,
    objective_notes TEXT,
    assessment TEXT,
    plan TEXT,
    follow_up_actions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE medical_history (
    id SERIAL PRIMARY KEY,
    entry_date TIMESTAMPTZ DEFAULT NOW(),
    medical_inform TEXT NOT NULL,
    treatment TEXT,
    recipe TEXT,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    visit_id INTEGER UNIQUE REFERENCES visits(id) ON DELETE CASCADE
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

const runStatements = async (statements) => {
  for (const statement of statements) {
    await pool.query(statement);
  }
};

const createAllTables = async () => {
  try {
    console.log('Dropping existing tables and types...');
    await runStatements(dropStatements);

    console.log('Creating enums, tables and relations...');
    await runStatements(createStatements);

    console.log('All tables created successfully.');
  } catch (error) {
    console.error('Error during table creation:', error);
  } finally {
    await pool.end();
    console.log('Database pool closed.');
  }
};

createAllTables();
