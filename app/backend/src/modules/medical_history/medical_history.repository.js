import pool from '../../db/pool.js';

const BASE_SELECT = `
  SELECT
    mh.id,
    mh.entry_date,
    mh.medical_inform,
    mh.treatment,
    mh.recipe,
    mh.patient_id,
    mh.doctor_id,
    mh.visit_id,
    p.full_name AS patient_name,
    p.document_id AS patient_document_id,
    p.email AS patient_email,
    p.phone AS patient_phone,
    u.full_name AS doctor_name,
    u.email AS doctor_email
  FROM medical_history mh
  LEFT JOIN patients p ON p.id = mh.patient_id
  LEFT JOIN users u ON u.id = mh.doctor_id
`;

const mapMedicalHistoryRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    entry_date: row.entry_date,
    medical_inform: row.medical_inform,
    treatment: row.treatment ?? null,
    recipe: row.recipe ?? null,
    patient_id: row.patient_id,
    doctor_id: row.doctor_id,
    visit_id: row.visit_id,
    patient_name: row.patient_name ?? null,
    patient_document_id: row.patient_document_id ?? null,
    patient_email: row.patient_email ?? null,
    patient_phone: row.patient_phone ?? null,
    doctor_name: row.doctor_name ?? null,
    doctor_email: row.doctor_email ?? null,
  };
};

export const listMedicalHistoryEntries = async ({ search, patientId, limit = 50, offset = 0 }) => {
  const filters = [];
  const params = [];
  let paramIndex = 1;

  if (search) {
    filters.push(`(
      p.full_name ILIKE $${paramIndex}
      OR COALESCE(p.document_id, '') ILIKE $${paramIndex}
      OR COALESCE(p.email, '') ILIKE $${paramIndex}
      OR COALESCE(p.phone, '') ILIKE $${paramIndex}
      OR COALESCE(mh.medical_inform, '') ILIKE $${paramIndex}
      OR COALESCE(mh.treatment, '') ILIKE $${paramIndex}
      OR COALESCE(mh.recipe, '') ILIKE $${paramIndex}
      OR COALESCE(u.full_name, '') ILIKE $${paramIndex}
    )`);
    params.push(`%${search}%`);
    paramIndex += 1;
  }

  if (patientId) {
    filters.push(`mh.patient_id = $${paramIndex}`);
    params.push(patientId);
    paramIndex += 1;
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const limitPlaceholder = `$${paramIndex}`;
  params.push(limit ?? 50);
  paramIndex += 1;

  const offsetPlaceholder = `$${paramIndex}`;
  params.push(offset ?? 0);

  const query = `
    ${BASE_SELECT}
    ${whereClause}
    ORDER BY mh.entry_date DESC, mh.id DESC
    LIMIT ${limitPlaceholder}
    OFFSET ${offsetPlaceholder}
  `;

  const { rows } = await pool.query(query, params);
  return rows.map(mapMedicalHistoryRow);
};

export const findMedicalHistoryById = async ({ id }) => {
  const query = `${BASE_SELECT} WHERE mh.id = $1`;
  const { rows } = await pool.query(query, [id]);
  return mapMedicalHistoryRow(rows[0]);
};

export const createMedicalHistoryEntry = async ({
  entryDate,
  medicalInform,
  treatment,
  recipe,
  patientId,
  doctorId,
  visitId,
}) => {
  const insertQuery = `
    INSERT INTO medical_history (
      entry_date,
      medical_inform,
      treatment,
      recipe,
      patient_id,
      doctor_id,
      visit_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `;

  const insertParams = [
    entryDate ?? new Date(),
    medicalInform,
    treatment ?? null,
    recipe ?? null,
    patientId,
    doctorId ?? null,
    visitId ?? null,
  ];

  const { rows } = await pool.query(insertQuery, insertParams);
  const createdId = rows?.[0]?.id;
  if (!createdId) return null;
  return findMedicalHistoryById({ id: createdId });
};

export const updateMedicalHistoryEntry = async ({
  id,
  entryDate,
  medicalInform,
  treatment,
  recipe,
  visitId,
}) => {
  const fields = [];
  const params = [];
  let paramIndex = 1;

  if (entryDate !== undefined) {
    fields.push(`entry_date = $${paramIndex}`);
    params.push(entryDate ?? null);
    paramIndex += 1;
  }

  if (medicalInform !== undefined) {
    fields.push(`medical_inform = $${paramIndex}`);
    params.push(medicalInform);
    paramIndex += 1;
  }

  if (treatment !== undefined) {
    fields.push(`treatment = $${paramIndex}`);
    params.push(treatment ?? null);
    paramIndex += 1;
  }

  if (recipe !== undefined) {
    fields.push(`recipe = $${paramIndex}`);
    params.push(recipe ?? null);
    paramIndex += 1;
  }

  if (visitId !== undefined) {
    fields.push(`visit_id = $${paramIndex}`);
    params.push(visitId ?? null);
    paramIndex += 1;
  }

  if (!fields.length) {
    return findMedicalHistoryById({ id });
  }

  params.push(id);

  const updateQuery = `
    UPDATE medical_history
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id
  `;

  const { rows } = await pool.query(updateQuery, params);
  const updatedId = rows?.[0]?.id;
  if (!updatedId) return null;
  return findMedicalHistoryById({ id: updatedId });
};

export const deleteMedicalHistoryEntry = async ({ id }) => {
  const { rows } = await pool.query('DELETE FROM medical_history WHERE id = $1 RETURNING id', [id]);
  return Boolean(rows?.[0]?.id);
};
