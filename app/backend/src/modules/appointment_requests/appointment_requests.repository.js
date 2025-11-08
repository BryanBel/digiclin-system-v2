import crypto from 'crypto';
import pool from '../../db/pool.js';
import { createAppointment } from '../appointments/appointments.repository.js';
import { APPOINTMENT_REQUEST_STATUS } from './appointment_requests.constants.js';
import {
  ensurePatientFromRequest,
  ensurePatientForUserRegistration,
} from '../patients/patients.repository.js';
import { calculateAge, parseDateInput } from '../../utils/dateHelpers.js';

export const createAppointmentRequest = async ({
  fullName,
  email,
  phone,
  documentId,
  birthDate,
  gender,
  age,
  symptoms,
  preferredDate,
  preferredTimeRange,
  isExistingPatient,
}) => {
  const shouldGenerateToken = isExistingPatient;
  const linkToken = shouldGenerateToken ? crypto.randomBytes(32).toString('hex') : null;
  const tokenExpiresAt = linkToken ? new Date(Date.now() + 1000 * 60 * 60 * 24) : null;
  const birthDateValue = parseDateInput(birthDate);
  const normalizedAge = age ?? calculateAge(birthDateValue);

  const query = `
    INSERT INTO appointment_requests (
      full_name,
      email,
      phone,
      document_id,
      birth_date,
      gender,
      age,
      symptoms,
      preferred_date,
      preferred_time_range,
      is_existing_patient,
      link_token,
      token_expires_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING *
  `;

  const values = [
    fullName,
    email,
    phone,
    documentId ?? null,
    birthDateValue,
    gender ?? null,
    normalizedAge ?? null,
    symptoms,
    preferredDate ?? null,
    preferredTimeRange ?? null,
    isExistingPatient,
    linkToken,
    tokenExpiresAt,
  ];

  const { rows } = await pool.query(query, values);
  return { request: rows[0], linkToken };
};

export const listAppointmentRequests = async ({ status, search, limit = 25, offset = 0 }) => {
  const filters = [];
  const params = [];
  let paramIndex = 1;

  if (status) {
    filters.push(`status = $${paramIndex++}`);
    params.push(status);
  }

  if (search) {
    filters.push(
      `(
        full_name ILIKE $${paramIndex}
        OR email ILIKE $${paramIndex}
        OR phone ILIKE $${paramIndex}
        OR document_id ILIKE $${paramIndex}
      )`,
    );
    params.push(`%${search}%`);
    paramIndex += 1;
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const query = `
    SELECT *
    FROM appointment_requests
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex++}
    OFFSET $${paramIndex}
  `;

  params.push(limit);
  params.push(offset);

  const { rows } = await pool.query(query, params);
  return rows;
};

export const listAppointmentRequestsForPatient = async ({
  patientId,
  userId,
  email,
  statuses,
} = {}) => {
  if (!patientId && !userId && !email) return [];

  const filters = [];
  const params = [];
  let index = 1;

  if (patientId) {
    filters.push(`patient_id = $${index}`);
    params.push(patientId);
    index += 1;
  } else if (userId) {
    filters.push(`user_id = $${index}`);
    params.push(userId);
    index += 1;
  } else if (email) {
    filters.push(`LOWER(email) = LOWER($${index})`);
    params.push(email);
    index += 1;
  }

  if (Array.isArray(statuses) && statuses.length) {
    filters.push(`status = ANY($${index}::text[])`);
    params.push(statuses);
    index += 1;
  } else {
    filters.push(`status <> $${index}`);
    params.push(APPOINTMENT_REQUEST_STATUS.CONFIRMED);
    index += 1;
  }

  if (!filters.length) return [];

  const query = `
    SELECT *
    FROM appointment_requests
    WHERE ${filters.join(' AND ')}
    ORDER BY created_at DESC
  `;

  const { rows } = await pool.query(query, params);
  return rows;
};

export const findAppointmentRequestById = async ({ id }) => {
  const query = `
    SELECT *
    FROM appointment_requests
    WHERE id = $1
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] ?? null;
};

export const updateAppointmentRequestStatus = async ({ id, status, adminNote }) => {
  const query = `
    UPDATE appointment_requests
    SET status = $1,
        admin_note = $2,
        updated_at = NOW()
    WHERE id = $3
    RETURNING *
  `;

  const { rows } = await pool.query(query, [status, adminNote ?? null, id]);
  return rows[0] ?? null;
};

export const confirmAppointmentRequest = async ({
  id,
  doctorId,
  scheduledFor,
  adminNote,
  createdByUser,
}) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const requestResult = await client.query(
      'SELECT * FROM appointment_requests WHERE id = $1 FOR UPDATE',
      [id],
    );

    const request = requestResult.rows[0];
    if (!request) throw new Error('Solicitud no encontrada');

    if (request.status === APPOINTMENT_REQUEST_STATUS.CONFIRMED) {
      throw new Error('La solicitud ya fue confirmada');
    }

    const patient = await ensurePatientFromRequest({
      client,
      fullName: request.full_name,
      phone: request.phone,
      email: request.email,
      documentId: request.document_id,
      birthDate: request.birth_date,
      gender: request.gender,
      age: request.age,
    });

    const patientId = patient?.id ?? null;
    const resolvedAge =
      patient?.age ??
      (patient?.birth_date ? calculateAge(patient.birth_date) : (request.age ?? null));

    const appointment = await createAppointment(
      {
        patientId,
        doctorId,
        scheduledFor,
        reason: request.symptoms,
        additionalNotes: adminNote ?? null,
        createdByUser,
        legacyName: request.full_name,
        legacyPhone: request.phone ?? null,
        intakePayload: request.public_id
          ? JSON.stringify({ requestPublicId: request.public_id })
          : null,
      },
      client,
    );

    const updateResult = await client.query(
      `
        UPDATE appointment_requests
        SET status = $1,
            admin_note = $2,
            appointment_id = $3,
            patient_id = $4,
            age = COALESCE(age, $5),
            updated_at = NOW()
        WHERE id = $6
        RETURNING *
      `,
      [
        APPOINTMENT_REQUEST_STATUS.CONFIRMED,
        adminNote ?? null,
        appointment.id,
        patientId,
        resolvedAge ?? null,
        id,
      ],
    );

    await client.query('COMMIT');

    return { request: updateResult.rows[0], appointment };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const assignUserToAppointmentRequests = async ({ email, userId }) => {
  if (!email || !userId) return [];

  const query = `
    UPDATE appointment_requests
    SET user_id = $2,
        is_existing_patient = true,
        updated_at = NOW()
    WHERE LOWER(email) = LOWER($1)
      AND (user_id IS NULL OR user_id <> $2)
    RETURNING *
  `;

  const { rows } = await pool.query(query, [email, userId]);
  return rows;
};

export const ensurePatientAndLinkRequestsForEmail = async ({
  email,
  fullName,
  phone,
  documentId,
  birthDate,
  gender,
  age,
}) => {
  if (!email) return null;

  const patient = await ensurePatientForUserRegistration({
    email,
    fullName,
    phone,
    documentId,
    birthDate,
    gender,
    age,
  });

  if (patient) {
    await linkPatientToAppointmentRequests({ email, patientId: patient.id });
  }

  return patient;
};

const linkPatientToAppointmentRequests = async ({ email, patientId }) => {
  const query = `
    UPDATE appointment_requests
    SET patient_id = $2,
        updated_at = NOW()
    WHERE LOWER(email) = LOWER($1)
      AND (patient_id IS NULL OR patient_id <> $2)
    RETURNING *
  `;

  await pool.query(query, [email, patientId]);
};

const isTokenExpired = (expiresAt) => {
  if (!expiresAt) return true;
  const expiry = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return true;
  return expiry.getTime() < Date.now();
};

export const findAppointmentRequestByLinkToken = async ({ token }) => {
  if (!token) return null;

  const { rows } = await pool.query(
    `
      SELECT *
      FROM appointment_requests
      WHERE link_token = $1
      LIMIT 1
    `,
    [token],
  );

  return rows[0] ?? null;
};

export const consumeAppointmentLinkToken = async ({ token, userId }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `
        SELECT *
        FROM appointment_requests
        WHERE link_token = $1
        FOR UPDATE
      `,
      [token],
    );

    const request = rows[0];
    if (!request) {
      await client.query('ROLLBACK');
      return { status: 'NOT_FOUND', request: null };
    }

    if (isTokenExpired(request.token_expires_at)) {
      await client.query('ROLLBACK');
      return { status: 'EXPIRED', request };
    }

    if (request.user_id && request.user_id !== userId) {
      await client.query('ROLLBACK');
      return { status: 'ALREADY_LINKED_OTHER', request };
    }

    const alreadyLinked = request.user_id === userId;

    const { rows: updatedRows } = await client.query(
      `
        UPDATE appointment_requests
        SET user_id = $2,
            is_existing_patient = true,
            link_token = NULL,
            token_expires_at = NULL,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [request.id, userId],
    );

    await client.query('COMMIT');

    return {
      status: alreadyLinked ? 'ALREADY_LINKED' : 'LINKED',
      request: updatedRows[0] ?? null,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
