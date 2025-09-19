import db from '../../db/pool.js';

export const getAllMedicalHistory = async () => {
  const result = await db.query('SELECT * FROM medical_history');
  return result.rows;
};

export const getMedicalHistoryById = async (id) => {
  const result = await db.query('SELECT * FROM medical_history WHERE id = $1', [id]);
  return result.rows[0];
};

export const createMedicalHistory = async (history) => {
  const { medical_inform, treatment, recipe, patient_id, doctor_id, entry_date } = history;
  const result = await db.query(
    'INSERT INTO medical_history (medical_inform, treatment, recipe, patient_id, doctor_id, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [medical_inform, treatment || null, recipe || null, patient_id, doctor_id, entry_date],
  );
  return result.rows[0];
};

export const updateMedicalHistory = async (id, history) => {
  const { medical_inform, treatment, recipe, patient_id, doctor_id } = history;
  const result = await db.query(
    'UPDATE medical_history SET medical_inform = $1, treatment = $2, recipe = $3, patient_id = $4, doctor_id = $5 WHERE id = $6 RETURNING *',
    [medical_inform, treatment, recipe, patient_id, doctor_id, id],
  );
  return result.rows[0];
};

export const deleteMedicalHistory = async (id) => {
  await db.query('DELETE FROM medical_history WHERE id = $1', [id]);
};

export const getMedicalHistoryByPatientId = async (patientId) => {
  const result = await db.query('SELECT * FROM medical_history WHERE patient_id = $1', [patientId]);
  return result.rows;
};
