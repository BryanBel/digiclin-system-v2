import db from '../../db/index.js';

export const getAllDoctors = async () => {
  const result = await db.query('SELECT * FROM users WHERE role = $1', ['doctor']);
  return result.rows;
};

export const getDoctorById = async (id) => {
  const result = await db.query('SELECT * FROM users WHERE id = $1 AND role = $2', [id, 'doctor']);
  return result.rows[0];
};

export const createDoctor = async (doctor) => {
  const { email, passwordHash, role } = doctor;
  const result = await db.query(
    'INSERT INTO users (email, passwordHash, role) VALUES ($1, $2, $3) RETURNING *',
    [email, passwordHash, role || 'doctor'],
  );
  return result.rows[0];
};

export const updateDoctor = async (id, doctor) => {
  const { email, passwordHash, role } = doctor;
  const result = await db.query(
    'UPDATE users SET email = $1, passwordHash = $2, role = $3 WHERE id = $4 RETURNING *',
    [email, passwordHash, role || 'doctor', id],
  );
  return result.rows[0];
};

export const deleteDoctor = async (id) => {
  await db.query('DELETE FROM users WHERE id = $1 AND role = $2', [id, 'doctor']);
};
