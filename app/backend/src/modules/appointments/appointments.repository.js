import pool from '../../db/pool.js';

const APPOINTMENT_BASE_SELECT = `
  SELECT
    a.id,
    a.public_id,
    a.patient_id,
    a.doctor_id,
    a.scheduled_for,
    a.duration_minutes,
    a.reason,
    a.additional_notes,
    a.channel,
    a.priority,
    a.status,
    a.confirmation_token,
    a.token_expires_at,
    a.confirmed_at,
    a.cancelled_at,
    a.cancellation_reason,
    a.created_at,
    a.updated_at,
    a.created_by_user,
    a.intake_payload,
    a.legacy_name,
    a.legacy_phone,
    p.full_name AS patient_name,
    p.phone AS patient_phone,
    p.email AS patient_email,
    p.document_id AS patient_document,
    u.full_name AS doctor_name,
    u.email AS doctor_email
  FROM appointments a
  LEFT JOIN patients p ON p.id = a.patient_id
  LEFT JOIN users u ON u.id = a.doctor_id
`;

const normaliseDateInput = (value) => {
  if (!value) {
    return new Date();
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Fecha proporcionada inválida.');
  }
  return parsed;
};

const deriveSeverityFromType = (emergencyType) => {
  if (!emergencyType) {
    return 'medium';
  }

  if (['accidente', 'fractura', 'golpe'].includes(emergencyType)) {
    return 'high';
  }

  return 'medium';
};

const resolveDoctorId = async (client, preferredDoctorId) => {
  if (preferredDoctorId) {
    return preferredDoctorId;
  }

  const { rows } = await client.query(
    `SELECT id
       FROM users
      WHERE role IN ('doctor', 'admin')
      ORDER BY (role = 'admin') DESC, created_at ASC
      LIMIT 1`,
  );

  return rows[0]?.id ?? null;
};

const findPatientByContact = async (client, { email, phone, documentId }) => {
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

  if (documentId) {
    conditions.push(`document_id = $${index++}`);
    values.push(documentId);
  }

  if (!conditions.length) {
    return null;
  }

  const query = `SELECT id FROM patients WHERE ${conditions.join(' OR ')} ORDER BY updated_at DESC LIMIT 1`;
  const { rows } = await client.query(query, values);

  return rows[0]?.id ?? null;
};

const createPatientRecord = async (client, patient) => {
  const {
    full_name,
    phone = null,
    email = null,
    document_id = null,
    birth_date = null,
    preferred_channel = null,
    metadata = {},
  } = patient;

  const result = await client.query(
    `INSERT INTO patients (
        full_name,
        phone,
        email,
        document_id,
        birth_date,
        preferred_channel,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
    [full_name, phone, email, document_id, birth_date, preferred_channel, metadata],
  );

  return result.rows[0].id;
};

const updatePatientRecord = async (client, id, patient) => {
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
    values.push(patient.birth_date ?? null);
  }

  if (Object.prototype.hasOwnProperty.call(patient, 'preferred_channel')) {
    fields.push(`preferred_channel = $${index++}`);
    values.push(patient.preferred_channel ?? null);
  }

  if (Object.prototype.hasOwnProperty.call(patient, 'metadata')) {
    fields.push(`metadata = $${index++}`);
    values.push(patient.metadata ?? {});
  }

  if (!fields.length) {
    return;
  }

  fields.push('updated_at = NOW()');

  await client.query(`UPDATE patients SET ${fields.join(', ')} WHERE id = $${index}`, [
    ...values,
    id,
  ]);
};

const ensurePatientForAppointment = async (client, { patientId, patientData }) => {
  if (patientId) {
    if (patientData && Object.keys(patientData).length > 0) {
      await updatePatientRecord(client, patientId, patientData);
    }
    return { patientId, legacyName: null, legacyPhone: null };
  }

  if (!patientData || !patientData.full_name) {
    throw new Error('Se requiere información del paciente para crear la cita.');
  }

  const existingPatientId = await findPatientByContact(client, {
    email: patientData.email,
    phone: patientData.phone,
    documentId: patientData.document_id,
  });

  if (existingPatientId) {
    await updatePatientRecord(client, existingPatientId, patientData);
    return { patientId: existingPatientId, legacyName: null, legacyPhone: null };
  }

  const createdPatientId = await createPatientRecord(client, patientData);
  return { patientId: createdPatientId, legacyName: null, legacyPhone: null };
};

const ensurePatientForEmergency = async (client, payload) => {
  const { name, phone } = payload;

  if (!name && !phone) {
    return {
      patientId: null,
      legacyName: 'Paciente sin identificar',
      legacyPhone: null,
    };
  }

  const existingPatientId = await findPatientByContact(client, {
    email: null,
    phone,
    documentId: null,
  });

  if (existingPatientId) {
    await updatePatientRecord(client, existingPatientId, {
      full_name: name ?? undefined,
      phone: phone ?? undefined,
      preferred_channel: phone ? 'phone' : undefined,
    });

    return {
      patientId: existingPatientId,
      legacyName: null,
      legacyPhone: null,
    };
  }

  const patientId = await createPatientRecord(client, {
    full_name: name || 'Paciente sin identificar',
    phone: phone ?? null,
    email: null,
    document_id: null,
    birth_date: null,
    preferred_channel: phone ? 'phone' : 'in_person',
    metadata: { created_from: 'emergency-intake' },
  });

  return {
    patientId,
    legacyName: null,
    legacyPhone: null,
  };
};

const fetchAppointmentById = async (client, id) => {
  const { rows } = await client.query(`${APPOINTMENT_BASE_SELECT} WHERE a.id = $1`, [id]);
  return rows[0] ?? null;
};

export const listAppointments = async (filters = {}) => {
  const {
    status,
    priority,
    channel,
    doctor_id: doctorId,
    patient_id: patientId,
    from,
    to,
    limit = 50,
  } = filters;

  const conditions = [];
  const values = [];
  let index = 1;

  if (status) {
    conditions.push(`a.status = $${index++}`);
    values.push(status);
  }

  if (priority) {
    conditions.push(`a.priority = $${index++}`);
    values.push(priority);
  }

  if (channel) {
    conditions.push(`a.channel = $${index++}`);
    values.push(channel);
  }

  if (doctorId) {
    conditions.push(`a.doctor_id = $${index++}`);
    values.push(doctorId);
  }

  if (patientId) {
    conditions.push(`a.patient_id = $${index++}`);
    values.push(patientId);
  }

  if (from) {
    conditions.push(`a.scheduled_for >= $${index++}`);
    values.push(normaliseDateInput(from));
  }

  if (to) {
    conditions.push(`a.scheduled_for <= $${index++}`);
    values.push(normaliseDateInput(to));
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const cappedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 200);

  const query = `${APPOINTMENT_BASE_SELECT} ${whereClause} ORDER BY a.scheduled_for ASC LIMIT ${cappedLimit}`;
  const { rows } = await pool.query(query, values);

  return rows;
};

export const createScheduledAppointment = async (payload) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const scheduledFor = normaliseDateInput(payload.scheduled_for);
    const duration = payload.duration_minutes ?? 30;
    const channel = payload.channel ?? 'public';
    const priority = payload.priority ?? 'routine';
    const status = payload.status ?? (channel === 'public' ? 'pending' : 'confirmed');
    const createdBy = payload.created_by_user ?? null;

    const { patientId } = await ensurePatientForAppointment(client, {
      patientId: payload.patient_id ?? null,
      patientData: payload.patient ?? null,
    });

    const doctorId = await resolveDoctorId(client, payload.doctor_id ?? null);

    const appointmentResult = await client.query(
      `INSERT INTO appointments (
         patient_id,
         doctor_id,
         scheduled_for,
         duration_minutes,
         reason,
         additional_notes,
         channel,
         priority,
         status,
         created_by_user,
         intake_payload
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        patientId,
        doctorId,
        scheduledFor,
        duration,
        payload.reason,
        payload.additional_notes ?? null,
        channel,
        priority,
        status,
        createdBy,
        payload.intake_payload ?? {},
      ],
    );

    const appointmentId = appointmentResult.rows[0].id;
    const appointment = await fetchAppointmentById(client, appointmentId);

    await client.query('COMMIT');
    return appointment;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const createEmergencyAppointment = async (payload) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const scheduledFor = normaliseDateInput(payload.datetime);
    const duration = payload.duration_minutes ?? 30;

    const { patientId, legacyName, legacyPhone } = await ensurePatientForEmergency(client, payload);
    const doctorId = await resolveDoctorId(client, payload.doctor_id ?? null);

    const intakePayload = {
      emergency_type: payload.emergency_type,
      description: payload.description,
      requested_at: scheduledFor.toISOString(),
      contact_phone: payload.phone ?? null,
    };

    const appointmentResult = await client.query(
      `INSERT INTO appointments (
         patient_id,
         doctor_id,
         scheduled_for,
         duration_minutes,
         reason,
         additional_notes,
         channel,
         priority,
         status,
         intake_payload,
         legacy_name,
         legacy_phone
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        patientId,
        doctorId,
        scheduledFor,
        duration,
        payload.description || 'Emergencia reportada por canal público',
        payload.additional_notes ?? null,
        'public',
        'emergency',
        'confirmed',
        intakePayload,
        legacyName,
        legacyPhone ?? payload.phone ?? null,
      ],
    );

    const appointmentId = appointmentResult.rows[0].id;

    const emergencyResult = await client.query(
      `INSERT INTO emergency_intake (
         appointment_id,
         severity_level,
         reported_symptoms,
         incident_location,
         transport_mode,
         acknowledged_at
       ) VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, appointment_id, severity_level, reported_symptoms, incident_location, transport_mode, acknowledged_at, resolved_at, created_at`,
      [
        appointmentId,
        deriveSeverityFromType(payload.emergency_type),
        payload.description ?? 'Sin descripción proporcionada',
        payload.incident_location ?? 'No especificado',
        payload.transport_mode ?? 'unknown',
      ],
    );

    const appointment = await fetchAppointmentById(client, appointmentId);

    await client.query('COMMIT');
    return {
      appointment,
      emergency_intake: emergencyResult.rows[0],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getAppointmentById = async (id) => {
  const { rows } = await pool.query(`${APPOINTMENT_BASE_SELECT} WHERE a.id = $1`, [id]);
  return rows[0] ?? null;
};
