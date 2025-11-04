import db from '../../db/pool.js';

const MEDICAL_HISTORY_COLUMNS = `
  id,
  entry_date,
  medical_inform,
  treatment,
  recipe,
  patient_id,
  doctor_id,
  visit_id
`;

export const getAllMedicalHistory = async () => {
  const result = await db.query(
    `SELECT ${MEDICAL_HISTORY_COLUMNS} FROM medical_history ORDER BY entry_date DESC`,
  );
  return result.rows;
};

export const getMedicalHistoryById = async (id) => {
  const result = await db.query(
    `SELECT ${MEDICAL_HISTORY_COLUMNS} FROM medical_history WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
};

export const getMedicalHistoryByPatientId = async (patientId) => {
  const result = await db.query(
    `SELECT ${MEDICAL_HISTORY_COLUMNS} FROM medical_history WHERE patient_id = $1 ORDER BY entry_date DESC`,
    [patientId],
  );
  return result.rows;
};

export const createMedicalHistory = async (history) => {
  const {
    medical_inform,
    treatment = null,
    recipe = null,
    patient_id,
    doctor_id = null,
    visit_id = null,
    entry_date = null,
  } = history;

  const result = await db.query(
    `INSERT INTO medical_history (
       medical_inform,
       treatment,
       recipe,
       patient_id,
       doctor_id,
       visit_id,
       entry_date
     ) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()))
     RETURNING ${MEDICAL_HISTORY_COLUMNS}`,
    [medical_inform, treatment, recipe, patient_id, doctor_id, visit_id, entry_date],
  );

  return result.rows[0];
};

export const updateMedicalHistory = async (id, history) => {
  const fields = [];
  const values = [];
  let index = 1;

  if (Object.prototype.hasOwnProperty.call(history, 'medical_inform')) {
    fields.push(`medical_inform = $${index++}`);
    values.push(history.medical_inform);
  }

  if (Object.prototype.hasOwnProperty.call(history, 'treatment')) {
    fields.push(`treatment = $${index++}`);
    values.push(history.treatment ?? null);
  }

  if (Object.prototype.hasOwnProperty.call(history, 'recipe')) {
    fields.push(`recipe = $${index++}`);
    values.push(history.recipe ?? null);
  }

  if (Object.prototype.hasOwnProperty.call(history, 'patient_id')) {
    fields.push(`patient_id = $${index++}`);
    values.push(history.patient_id);
  }

  if (Object.prototype.hasOwnProperty.call(history, 'doctor_id')) {
    fields.push(`doctor_id = $${index++}`);
    values.push(history.doctor_id ?? null);
  }

  if (Object.prototype.hasOwnProperty.call(history, 'visit_id')) {
    fields.push(`visit_id = $${index++}`);
    values.push(history.visit_id ?? null);
  }

  if (Object.prototype.hasOwnProperty.call(history, 'entry_date')) {
    fields.push(`entry_date = COALESCE($${index++}, entry_date)`);
    values.push(history.entry_date ?? null);
  }

  if (!fields.length) {
    return getMedicalHistoryById(id);
  }

  const result = await db.query(
    `UPDATE medical_history SET ${fields.join(', ')} WHERE id = $${index} RETURNING ${MEDICAL_HISTORY_COLUMNS}`,
    [...values, id],
  );

  return result.rows[0] ?? null;
};

export const deleteMedicalHistory = async (id) => {
  await db.query('DELETE FROM medical_history WHERE id = $1', [id]);
};
