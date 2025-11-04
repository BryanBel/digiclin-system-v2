import db from '../../db/pool.js';

const PATIENT_COLUMNS = `
  id,
  public_id,
  full_name,
  phone,
  email,
  document_id,
  birth_date,
  preferred_channel,
  metadata,
  created_at,
  updated_at
`;

const normaliseBirthDate = (birthDate) => {
  if (!birthDate) return null;
  if (typeof birthDate === 'string' && birthDate.trim() === '') {
    return null;
  }
  if (birthDate instanceof Date) {
    return birthDate.toISOString().slice(0, 10);
  }
  return birthDate;
};

const sanitiseMetadata = (metadata) => {
  if (!metadata) return {};
  if (typeof metadata === 'object' && !Array.isArray(metadata)) return metadata;
  return {};
};

export const getAllPatients = async () => {
  const result = await db.query(`SELECT ${PATIENT_COLUMNS} FROM patients ORDER BY created_at DESC`);
  return result.rows;
};

export const getPatientById = async (id) => {
  const result = await db.query(`SELECT ${PATIENT_COLUMNS} FROM patients WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
};

export const findPatientByContact = async ({ email, phone, document_id }) => {
  let index = 1;
  const conditions = [];
  const values = [];

  if (email) {
    conditions.push(`email = $${index++}`);
    values.push(email);
  }

  if (phone) {
    conditions.push(`phone = $${index++}`);
    values.push(phone);
  }

  if (document_id) {
    conditions.push(`document_id = $${index++}`);
    values.push(document_id);
  }

  if (!conditions.length) {
    return null;
  }

  const query = `SELECT ${PATIENT_COLUMNS} FROM patients WHERE ${conditions.join(' OR ')} ORDER BY updated_at DESC LIMIT 1`;
  const result = await db.query(query, values);
  return result.rows[0] ?? null;
};

export const createPatient = async (patient) => {
  const {
    full_name,
    phone = null,
    email = null,
    document_id = null,
    birth_date = null,
    preferred_channel = null,
    metadata = {},
  } = patient;

  const result = await db.query(
    `INSERT INTO patients (
      full_name,
      phone,
      email,
      document_id,
      birth_date,
      preferred_channel,
      metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING ${PATIENT_COLUMNS}`,
    [
      full_name,
      phone,
      email,
      document_id,
      normaliseBirthDate(birth_date),
      preferred_channel,
      sanitiseMetadata(metadata),
    ],
  );

  return result.rows[0];
};

export const updatePatient = async (id, patient) => {
  const fields = [];
  const values = [];
  let index = 1;

  if (Object.prototype.hasOwnProperty.call(patient, 'full_name')) {
    fields.push(`full_name = $${index++}`);
    values.push(patient.full_name);
  }

  if (Object.prototype.hasOwnProperty.call(patient, 'phone')) {
    fields.push(`phone = $${index++}`);
    values.push(patient.phone ?? null);
  }

  if (Object.prototype.hasOwnProperty.call(patient, 'email')) {
    fields.push(`email = $${index++}`);
    values.push(patient.email ?? null);
  }

  if (Object.prototype.hasOwnProperty.call(patient, 'document_id')) {
    fields.push(`document_id = $${index++}`);
    values.push(patient.document_id ?? null);
  }

  if (Object.prototype.hasOwnProperty.call(patient, 'birth_date')) {
    fields.push(`birth_date = $${index++}`);
    values.push(normaliseBirthDate(patient.birth_date));
  }

  if (Object.prototype.hasOwnProperty.call(patient, 'preferred_channel')) {
    fields.push(`preferred_channel = $${index++}`);
    values.push(patient.preferred_channel ?? null);
  }

  if (Object.prototype.hasOwnProperty.call(patient, 'metadata')) {
    fields.push(`metadata = $${index++}`);
    values.push(sanitiseMetadata(patient.metadata));
  }

  if (!fields.length) {
    return getPatientById(id);
  }

  fields.push('updated_at = NOW()');

  const result = await db.query(
    `UPDATE patients SET ${fields.join(', ')} WHERE id = $${index} RETURNING ${PATIENT_COLUMNS}`,
    [...values, id],
  );

  return result.rows[0] ?? null;
};

export const deletePatient = async (id) => {
  await db.query('DELETE FROM patients WHERE id = $1', [id]);
};
