import pool from '../../db/pool.js';
import { calculateAge, parseDateInput } from '../../utils/dateHelpers.js';

const getClient = (client) => client ?? pool;

const sanitiseMetadata = (metadata) => {
  if (!metadata) return {};
  if (typeof metadata === 'object' && !Array.isArray(metadata)) return metadata;
  return {};
};

const fetchLatestAppointmentRequestByEmail = async (email, client) => {
  if (!email) return null;

  const db = getClient(client);
  const { rows } = await db.query(
    `
      SELECT full_name, phone, email, document_id, birth_date, gender, age
      FROM appointment_requests
      WHERE LOWER(email) = LOWER($1)
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [email],
  );

  return rows[0] ?? null;
};

export const findPatientByDocumentOrEmail = async ({ documentId, email }, client) => {
  if (!documentId && !email) return null;

  const db = getClient(client);
  const conditions = [];
  const params = [];

  if (documentId) {
    params.push(documentId);
    conditions.push(`document_id = $${params.length}`);
  }

  if (email) {
    params.push(email);
    conditions.push(`LOWER(email) = LOWER($${params.length})`);
  }

  const query = `
    SELECT *
    FROM patients
    WHERE ${conditions.join(' OR ')}
    LIMIT 1
  `;

  const { rows } = await db.query(query, params);
  return rows[0] ?? null;
};

export const createPatient = async (payload, client) => {
  const db = getClient(client);
  const birthDate = parseDateInput(payload.birthDate);
  const age = payload.age ?? calculateAge(birthDate);

  const { rows } = await db.query(
    `
      INSERT INTO patients (
        full_name,
        phone,
        email,
        document_id,
        birth_date,
        gender,
        age,
        preferred_channel,
        metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `,
    [
      payload.fullName,
      payload.phone ?? null,
      payload.email ?? null,
      payload.documentId ?? null,
      birthDate,
      payload.gender ?? null,
      age,
      payload.preferredChannel ?? null,
      sanitiseMetadata(payload.metadata),
    ],
  );

  return rows[0];
};

export const updatePatient = async ({ id, ...payload }, client) => {
  const db = getClient(client);
  const birthDate = parseDateInput(payload.birthDate);
  const age = payload.age ?? calculateAge(birthDate);

  const { rows } = await db.query(
    `
      UPDATE patients
      SET full_name = COALESCE($2, full_name),
          phone = COALESCE($3, phone),
          email = COALESCE($4, email),
          document_id = COALESCE($5, document_id),
          birth_date = COALESCE($6, birth_date),
          gender = COALESCE($7, gender),
          age = COALESCE($8, age),
          preferred_channel = COALESCE($9, preferred_channel),
          metadata = COALESCE($10, metadata),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [
      id,
      payload.fullName ?? null,
      payload.phone ?? null,
      payload.email ?? null,
      payload.documentId ?? null,
      birthDate,
      payload.gender ?? null,
      age,
      payload.preferredChannel ?? null,
      payload.metadata ? sanitiseMetadata(payload.metadata) : null,
    ],
  );

  return rows[0] ?? null;
};

export const listPatients = async ({ search, limit = 50, offset = 0 } = {}) => {
  const params = [];
  const filters = [];

  if (search) {
    params.push(`%${search}%`);
    params.push(`%${search}%`);
    params.push(`%${search}%`);
    filters.push(`(
      LOWER(p.full_name) LIKE LOWER($${params.length - 2})
      OR LOWER(p.email) LIKE LOWER($${params.length - 1})
      OR p.document_id ILIKE $${params.length}
    )`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  params.push(limit);
  params.push(offset);

  const query = `
    SELECT
      p.*,
      COUNT(a.id) AS appointments_count,
      MAX(a.scheduled_for) AS last_appointment_at
    FROM patients p
    LEFT JOIN appointments a ON a.patient_id = p.id
    ${whereClause}
    GROUP BY p.id
    ORDER BY p.updated_at DESC
    LIMIT $${params.length - 1}
    OFFSET $${params.length}
  `;

  const { rows } = await pool.query(query, params);
  return rows;
};

export const findPatientById = async ({ id }) => {
  const { rows } = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
  return rows[0] ?? null;
};

export const ensurePatientFromRequest = async ({
  client,
  fullName,
  phone,
  email,
  documentId,
  birthDate,
  gender,
  age,
}) => {
  const db = getClient(client);

  const existing = await findPatientByDocumentOrEmail({ documentId, email }, db);

  if (existing) {
    return updatePatient(
      {
        id: existing.id,
        fullName,
        phone,
        email,
        documentId,
        birthDate,
        gender,
        age: age ?? calculateAge(birthDate ?? existing.birth_date),
      },
      db,
    );
  }

  return createPatient(
    {
      fullName,
      phone,
      email,
      documentId,
      birthDate,
      gender,
      age,
    },
    db,
  );
};

export const ensurePatientForUserRegistration = async (
  { email, fullName, phone, documentId, birthDate, gender, age } = {},
  client,
) => {
  if (!email) return null;

  const db = getClient(client);
  const existing = await findPatientByDocumentOrEmail({ email }, db);
  const latestRequest = await fetchLatestAppointmentRequestByEmail(email, db);

  const sanitizedFullName = typeof fullName === 'string' ? fullName.trim() : '';
  const sanitizedPhone = typeof phone === 'string' ? phone.trim() : '';
  const sanitizedDocumentId = typeof documentId === 'string' ? documentId.trim() : '';

  let sanitizedBirthDate = null;
  if (birthDate instanceof Date) {
    sanitizedBirthDate = birthDate;
  } else if (typeof birthDate === 'string' && birthDate.trim()) {
    sanitizedBirthDate = birthDate.trim();
  }

  const sanitizedGender = typeof gender === 'string' ? gender.trim().toLowerCase() : null;
  const sanitizedAge = typeof age === 'number' && Number.isFinite(age) ? age : null;

  const pickString = (...candidates) => {
    for (const candidate of candidates) {
      if (typeof candidate !== 'string') continue;
      const trimmed = candidate.trim();
      if (trimmed) return trimmed;
    }
    return null;
  };

  const ALLOWED_GENDERS = new Set(['male', 'female']);

  const pickGender = (...candidates) => {
    for (const candidate of candidates) {
      if (typeof candidate !== 'string') continue;
      const normalized = candidate.trim().toLowerCase();
      if (ALLOWED_GENDERS.has(normalized)) {
        return normalized;
      }
    }
    return null;
  };

  const pickBirthDate = (...candidates) => {
    for (const candidate of candidates) {
      if (!candidate) continue;
      if (candidate instanceof Date) {
        if (!Number.isNaN(candidate.getTime())) return candidate;
      } else if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (trimmed) return trimmed;
      }
    }
    return null;
  };

  const pickNumber = (...candidates) => {
    for (const candidate of candidates) {
      if (typeof candidate === 'number' && Number.isFinite(candidate)) {
        return candidate;
      }
    }
    return null;
  };

  const normalizedName =
    pickString(sanitizedFullName, latestRequest?.full_name, existing?.full_name) ||
    email.split('@')[0] ||
    email;

  const normalizedPhone = pickString(sanitizedPhone, latestRequest?.phone, existing?.phone);
  const normalizedDocumentId = pickString(
    sanitizedDocumentId,
    latestRequest?.document_id,
    existing?.document_id,
  );

  const normalizedBirthDate = pickBirthDate(
    sanitizedBirthDate,
    latestRequest?.birth_date,
    existing?.birth_date,
  );

  const normalizedGender = pickGender(sanitizedGender, latestRequest?.gender, existing?.gender);

  const calculatedAgeFromBirth = normalizedBirthDate ? calculateAge(normalizedBirthDate) : null;
  const normalizedAge = pickNumber(
    sanitizedAge,
    latestRequest?.age,
    calculatedAgeFromBirth,
    existing?.age,
  );

  if (existing) {
    const updatePayload = {
      id: existing.id,
      fullName: normalizedName,
      phone: normalizedPhone ?? existing.phone ?? null,
      email,
      documentId: normalizedDocumentId ?? existing.document_id ?? null,
      birthDate: normalizedBirthDate,
      gender: normalizedGender ?? existing.gender ?? null,
      age: normalizedAge ?? existing.age ?? null,
    };

    return updatePatient(updatePayload, db);
  }

  return createPatient(
    {
      fullName: normalizedName,
      email,
      phone: normalizedPhone ?? undefined,
      documentId: normalizedDocumentId ?? undefined,
      birthDate: normalizedBirthDate ?? undefined,
      gender: normalizedGender ?? undefined,
      age: normalizedAge ?? undefined,
    },
    db,
  );
};
