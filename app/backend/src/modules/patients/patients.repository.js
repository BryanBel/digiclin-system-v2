import db from '../../db/pool.js';

export const getAllPatients = async () => {
  const result = await db.query('SELECT * FROM patients');
  return result.rows;
};

export const getPatientById = async (id) => {
  const result = await db.query('SELECT * FROM patients WHERE id = $1', [id]);
  return result.rows[0];
};

export const createPatient = async (patient) => {
  const { name, phone, cedula } = patient;
  const result = await db.query(
    'INSERT INTO patients (name, phone, cedula) VALUES ($1, $2, $3) RETURNING *',
    [name, phone, cedula],
  );
  return result.rows[0];
};

export const updatePatient = async (id, patient) => {
  const { name, phone, cedula } = patient;
  const result = await db.query(
    'UPDATE patients SET name = $1, phone = $2, cedula = $3 WHERE id = $4 RETURNING *',
    [name, phone, cedula, id],
  );
  return result.rows[0];
};

export const deletePatient = async (id) => {
  await db.query('DELETE FROM patients WHERE id = $1', [id]);
};
