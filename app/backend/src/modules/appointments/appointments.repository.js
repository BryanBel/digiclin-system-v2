import pool from '../../db/pool.js';

export async function createAppointment(
  {
    patientId,
    doctorId,
    scheduledFor,
    reason,
    additionalNotes,
    channel = 'public',
    priority = 'routine',
    status = 'confirmed',
    createdByUser,
    legacyName,
    legacyPhone,
    intakePayload,
  },
  client,
) {
  const db = client ?? pool;
  const query = `
    INSERT INTO appointments (
      patient_id,
      doctor_id,
      scheduled_for,
      reason,
      additional_notes,
      channel,
      priority,
      status,
      created_by_user,
      legacy_name,
      legacy_phone,
      intake_payload
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *
  `;

  const values = [
    patientId ?? null,
    doctorId,
    scheduledFor,
    reason ?? null,
    additionalNotes ?? null,
    channel,
    priority,
    status,
    createdByUser ?? null,
    legacyName ?? null,
    legacyPhone ?? null,
    intakePayload ?? null,
  ];

  const { rows } = await db.query(query, values);
  return rows[0];
}

export async function findAppointmentById({ id }) {
  const query = `
    SELECT a.*, u.email AS doctor_email, u.full_name AS doctor_name,
      COALESCE(p.full_name, a.legacy_name) AS patient_name,
      p.full_name AS patient_full_name,
      p.document_id AS patient_document_id,
      p.email AS patient_email,
      p.phone AS patient_phone,
      p.gender AS patient_gender,
      p.age AS patient_age,
      p.birth_date AS patient_birth_date,
      v.id AS visit_id,
      v.public_id AS visit_public_id,
      (
        SELECT mh.id
        FROM medical_history mh
        LEFT JOIN visits mv ON mv.id = mh.visit_id
        WHERE mh.patient_id = a.patient_id
          AND (
            (mh.visit_id IS NOT NULL AND mv.appointment_id = a.id)
            OR (
              mh.visit_id IS NULL
              AND mh.entry_date IS NOT NULL
              AND mh.entry_date::date = a.scheduled_for::date
              AND (mh.doctor_id IS NULL OR mh.doctor_id = a.doctor_id)
            )
          )
        ORDER BY mh.entry_date DESC
        LIMIT 1
      ) AS medical_history_id
    FROM appointments a
    LEFT JOIN users u ON u.id = a.doctor_id
    LEFT JOIN patients p ON p.id = a.patient_id
    LEFT JOIN visits v ON v.appointment_id = a.id
    WHERE a.id = $1
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] ?? null;
}

export async function listAppointments({ status, limit = 50, offset = 0 }) {
  const filters = [];
  const params = [];
  let index = 1;

  if (status) {
    filters.push(`a.status = $${index++}`);
    params.push(status);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const query = `
    SELECT a.*, u.email AS doctor_email, u.full_name AS doctor_name,
      COALESCE(p.full_name, a.legacy_name) AS patient_name,
      p.full_name AS patient_full_name,
      p.document_id AS patient_document_id,
      p.email AS patient_email,
      p.phone AS patient_phone,
      p.gender AS patient_gender,
      p.age AS patient_age,
      p.birth_date AS patient_birth_date,
      v.id AS visit_id,
      v.public_id AS visit_public_id,
      (
        SELECT mh.id
        FROM medical_history mh
        LEFT JOIN visits mv ON mv.id = mh.visit_id
        WHERE mh.patient_id = a.patient_id
          AND (
            (mh.visit_id IS NOT NULL AND mv.appointment_id = a.id)
            OR (
              mh.visit_id IS NULL
              AND mh.entry_date IS NOT NULL
              AND mh.entry_date::date = a.scheduled_for::date
              AND (mh.doctor_id IS NULL OR mh.doctor_id = a.doctor_id)
            )
          )
        ORDER BY mh.entry_date DESC
        LIMIT 1
      ) AS medical_history_id
    FROM appointments a
    LEFT JOIN users u ON u.id = a.doctor_id
    LEFT JOIN patients p ON p.id = a.patient_id
    LEFT JOIN visits v ON v.appointment_id = a.id
    ${whereClause}
    ORDER BY a.scheduled_for DESC
    LIMIT $${index++}
    OFFSET $${index}
  `;

  params.push(limit);
  params.push(offset);

  const { rows } = await pool.query(query, params);
  return rows;
}

export async function listAppointmentsForDoctor({
  doctorId,
  status,
  limit = 50,
  offset = 0,
  fromDate,
}) {
  const filters = ['a.doctor_id = $1'];
  const params = [doctorId];
  let index = 2;

  if (status) {
    filters.push(`a.status = $${index}`);
    params.push(status);
    index += 1;
  }

  if (fromDate) {
    filters.push(`a.scheduled_for >= $${index}`);
    params.push(fromDate);
    index += 1;
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const query = `
    SELECT a.*, u.email AS doctor_email, u.full_name AS doctor_name,
      COALESCE(p.full_name, a.legacy_name) AS patient_name,
      p.full_name AS patient_full_name,
      p.document_id AS patient_document_id,
      p.email AS patient_email,
      p.phone AS patient_phone,
      p.gender AS patient_gender,
      p.age AS patient_age,
      p.birth_date AS patient_birth_date,
      v.id AS visit_id,
      v.public_id AS visit_public_id,
      (
        SELECT mh.id
        FROM medical_history mh
        LEFT JOIN visits mv ON mv.id = mh.visit_id
        WHERE mh.patient_id = a.patient_id
          AND (
            (mh.visit_id IS NOT NULL AND mv.appointment_id = a.id)
            OR (
              mh.visit_id IS NULL
              AND mh.entry_date IS NOT NULL
              AND mh.entry_date::date = a.scheduled_for::date
              AND (mh.doctor_id IS NULL OR mh.doctor_id = a.doctor_id)
            )
          )
        ORDER BY mh.entry_date DESC
        LIMIT 1
      ) AS medical_history_id
    FROM appointments a
    LEFT JOIN users u ON u.id = a.doctor_id
    LEFT JOIN patients p ON p.id = a.patient_id
    LEFT JOIN visits v ON v.appointment_id = a.id
    ${whereClause}
    ORDER BY a.scheduled_for ASC
    LIMIT $${index}
    OFFSET $${index + 1}
  `;

  params.push(limit);
  params.push(offset);

  const { rows } = await pool.query(query, params);
  return rows;
}

export async function listAppointmentsForPatient({
  patientId,
  patientEmail,
  status,
  limit = 50,
  offset = 0,
  fromDate,
}) {
  const filters = [];
  const params = [];
  let index = 1;

  if (patientId) {
    filters.push(`a.patient_id = $${index}`);
    params.push(patientId);
    index += 1;
  } else if (patientEmail) {
    filters.push(`LOWER(p.email) = LOWER($${index})`);
    params.push(patientEmail);
    index += 1;
  } else {
    return [];
  }

  if (status) {
    filters.push(`a.status = $${index}`);
    params.push(status);
    index += 1;
  }

  if (fromDate) {
    filters.push(`a.scheduled_for >= $${index}`);
    params.push(fromDate);
    index += 1;
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const query = `
    SELECT a.*, u.email AS doctor_email, u.full_name AS doctor_name,
      COALESCE(p.full_name, a.legacy_name) AS patient_name,
      p.full_name AS patient_full_name,
      p.document_id AS patient_document_id,
      p.email AS patient_email,
      p.phone AS patient_phone,
      p.gender AS patient_gender,
      p.age AS patient_age,
      p.birth_date AS patient_birth_date,
      v.id AS visit_id,
      v.public_id AS visit_public_id,
      (
        SELECT mh.id
        FROM medical_history mh
        LEFT JOIN visits mv ON mv.id = mh.visit_id
        WHERE mh.patient_id = a.patient_id
          AND (
            (mh.visit_id IS NOT NULL AND mv.appointment_id = a.id)
            OR (
              mh.visit_id IS NULL
              AND mh.entry_date IS NOT NULL
              AND mh.entry_date::date = a.scheduled_for::date
              AND (mh.doctor_id IS NULL OR mh.doctor_id = a.doctor_id)
            )
          )
        ORDER BY mh.entry_date DESC
        LIMIT 1
      ) AS medical_history_id
    FROM appointments a
    LEFT JOIN users u ON u.id = a.doctor_id
    LEFT JOIN patients p ON p.id = a.patient_id
    LEFT JOIN visits v ON v.appointment_id = a.id
    ${whereClause}
    ORDER BY a.scheduled_for ASC
    LIMIT $${index}
    OFFSET $${index + 1}
  `;

  params.push(limit);
  params.push(offset);

  const { rows } = await pool.query(query, params);
  return rows;
}
