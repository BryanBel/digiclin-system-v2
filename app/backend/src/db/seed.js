import bcrypt from 'bcrypt';
import pool from './pool.js';
import { calculateAge } from '../utils/dateHelpers.js';

const DEFAULT_PASSWORD = 'Admin123!';

const ensureAdminUser = async () => {
  const adminEmail = 'admin@digiclin.test';
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const existing = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [adminEmail]);
  if (existing.rows.length > 0) {
    const { id } = existing.rows[0];
    await pool.query(
      `UPDATE users
         SET full_name = $1,
             passwordhash = $2,
             role = $3,
             verify_email = true,
             updated_at = NOW()
       WHERE id = $4`,
      ['Dr. Admin Seed', passwordHash, 'admin', id],
    );
    return id;
  }

  const inserted = await pool.query(
    `INSERT INTO users (full_name, email, passwordhash, role, verify_email)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id`,
    ['Dr. Admin Seed', adminEmail, passwordHash, 'admin'],
  );

  return inserted.rows[0].id;
};

const ensureDoctorUser = async ({ fullName, email }) => {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const existing = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
  if (existing.rows.length > 0) {
    const { id } = existing.rows[0];
    await pool.query(
      `UPDATE users
         SET full_name = $1,
             passwordhash = $2,
             role = $3,
             verify_email = true,
             updated_at = NOW()
       WHERE id = $4`,
      [fullName, passwordHash, 'doctor', id],
    );
    return id;
  }

  const inserted = await pool.query(
    `INSERT INTO users (full_name, email, passwordhash, role, verify_email)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id`,
    [fullName, email, passwordHash, 'doctor'],
  );

  return inserted.rows[0].id;
};

const ensureDemoPatient = async () => {
  const patientEmail = 'paciente.demo@digiclin.test';
  const birthDate = '1990-01-01';
  const gender = 'female';
  const age = calculateAge(birthDate); // Using shared utility function

  const existing = await pool.query('SELECT id FROM patients WHERE email = $1 LIMIT 1', [
    patientEmail,
  ]);
  if (existing.rows.length > 0) {
    const { id } = existing.rows[0];
    await pool.query(
      `UPDATE patients
         SET full_name = $1,
             phone = $2,
             document_id = $3,
             birth_date = $4,
             gender = $5,
             age = $6,
             preferred_channel = $7,
             updated_at = NOW()
       WHERE id = $8`,
      ['Paciente Demo', '555-0101', 'D-0001', birthDate, gender, age, 'phone', id],
    );
    return id;
  }

  const inserted = await pool.query(
    `INSERT INTO patients (full_name, phone, email, document_id, birth_date, gender, age, preferred_channel)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    ['Paciente Demo', '555-0101', patientEmail, 'D-0001', birthDate, gender, age, 'phone'],
  );

  return inserted.rows[0].id;
};

const ensureScheduledAppointment = async ({ patientId, doctorId }) => {
  const scheduledDate = new Date();
  scheduledDate.setDate(scheduledDate.getDate() + 1);
  scheduledDate.setHours(10, 0, 0, 0);

  const { rows } = await pool.query(
    `SELECT id FROM appointments
      WHERE patient_id = $1
        AND doctor_id = $2
        AND DATE(scheduled_for) = DATE($3)
      LIMIT 1`,
    [patientId, doctorId, scheduledDate],
  );

  if (rows.length > 0) {
    await pool.query(
      `UPDATE appointments
         SET priority = $1,
             channel = $2,
             reason = $3,
             status = $4,
             updated_at = NOW()
       WHERE id = $5`,
      ['routine', 'portal', 'Control médico programado', 'confirmed', rows[0].id],
    );
    return rows[0].id;
  }

  const inserted = await pool.query(
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
        created_by_user
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
    [
      patientId,
      doctorId,
      scheduledDate,
      30,
      'Control médico programado',
      'Consulta de seguimiento generada por seed.',
      'portal',
      'routine',
      'confirmed',
      doctorId,
    ],
  );

  return inserted.rows[0].id;
};

const ensureEmergencyAppointment = async ({ patientId, doctorId }) => {
  const existing = await pool.query(
    `SELECT a.id, ei.id AS emergency_id
       FROM appointments a
       LEFT JOIN emergency_intake ei ON ei.appointment_id = a.id
      WHERE a.patient_id = $1 AND a.priority = 'emergency'
      ORDER BY a.created_at DESC
      LIMIT 1`,
    [patientId],
  );

  if (existing.rows.length > 0) {
    const appointmentId = existing.rows[0].id;
    await pool.query(
      `UPDATE appointments
         SET channel = $1,
             status = $2,
             intake_payload = $3,
             updated_at = NOW()
       WHERE id = $4`,
      [
        'public',
        'confirmed',
        {
          intake_type: 'emergency',
          reason: 'Dolor agudo en el pecho (seed)',
          contact_phone: '555-9999',
        },
        appointmentId,
      ],
    );

    if (!existing.rows[0].emergency_id) {
      await pool.query(
        `INSERT INTO emergency_intake (
           appointment_id,
           severity_level,
           reported_symptoms,
           incident_location,
           transport_mode,
           acknowledged_at
         ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          appointmentId,
          'high',
          'Dolor torácico severo y sudoración',
          'Clínica principal',
          'ambulance',
        ],
      );
    }

    return appointmentId;
  }

  const emergencyAppointment = await pool.query(
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
        intake_payload
      ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
    [
      patientId,
      doctorId,
      15,
      'Evaluación de emergencia',
      'Ingreso automático generado por seed.',
      'public',
      'emergency',
      'confirmed',
      {
        intake_type: 'emergency',
        reason: 'Dolor agudo en el pecho (seed)',
        contact_phone: '555-9999',
      },
    ],
  );

  const appointmentId = emergencyAppointment.rows[0].id;

  await pool.query(
    `INSERT INTO emergency_intake (
       appointment_id,
       severity_level,
       reported_symptoms,
       incident_location,
       transport_mode,
       acknowledged_at
     ) VALUES ($1, $2, $3, $4, $5, NOW())`,
    [appointmentId, 'high', 'Dolor torácico severo y sudoración', 'Clínica principal', 'ambulance'],
  );

  return appointmentId;
};

const ensureVisitForAppointment = async ({ appointmentId, patientId, doctorId, source }) => {
  const { rows } = await pool.query('SELECT id FROM visits WHERE appointment_id = $1 LIMIT 1', [
    appointmentId,
  ]);

  if (rows.length > 0) {
    const visitId = rows[0].id;
    await pool.query(
      `UPDATE visits
         SET completed_at = completed_at,
             updated_at = NOW()
       WHERE id = $1`,
      [visitId],
    );
    return visitId;
  }

  const created = await pool.query(
    `INSERT INTO visits (
        appointment_id,
        patient_id,
        doctor_id,
        started_at,
        chief_complaint,
        objective_notes
      ) VALUES ($1, $2, $3, NOW(), $4, $5)
      RETURNING id`,
    [
      appointmentId,
      patientId,
      doctorId,
      source === 'emergency' ? 'Evaluación de emergencia' : 'Control médico programado',
      source === 'emergency'
        ? 'Visita generada automáticamente desde el seed (emergencia).'
        : 'Visita programada generada automáticamente desde el seed.',
    ],
  );

  return created.rows[0].id;
};

const ensureMedicalHistoryEntry = async ({
  patientId,
  doctorId,
  visitId,
  entryDate,
  medicalInform,
  treatment,
  recipe,
}) => {
  const existing = await pool.query('SELECT id FROM medical_history WHERE visit_id = $1 LIMIT 1', [
    visitId,
  ]);

  if (existing.rows.length > 0) {
    const historyId = existing.rows[0].id;
    await pool.query(
      `UPDATE medical_history
         SET entry_date = COALESCE($2, entry_date),
             medical_inform = COALESCE($3, medical_inform),
             treatment = COALESCE($4, treatment),
             recipe = COALESCE($5, recipe)
       WHERE id = $1`,
      [historyId, entryDate, medicalInform, treatment, recipe],
    );
    return historyId;
  }

  const created = await pool.query(
    `INSERT INTO medical_history (
        entry_date,
        medical_inform,
        treatment,
        recipe,
        patient_id,
        doctor_id,
        visit_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
    [
      entryDate ?? new Date(),
      medicalInform,
      treatment ?? null,
      recipe ?? null,
      patientId,
      doctorId,
      visitId,
    ],
  );

  return created.rows[0].id;
};

const run = async () => {
  try {
    console.log('Creando usuario administrador semilla...');
    const doctorId = await ensureAdminUser();
    console.log(`Administrador listo con ID: ${doctorId}`);

    console.log('Creando doctores semilla...');
    const doctorAnaId = await ensureDoctorUser({
      fullName: 'Dra. Ana Fernández',
      email: 'ana.fernandez@digiclin.test',
    });
    const doctorLuisId = await ensureDoctorUser({
      fullName: 'Dr. Luis Herrera',
      email: 'luis.herrera@digiclin.test',
    });
    console.log(`Doctores listos con IDs: ${doctorAnaId}, ${doctorLuisId}`);

    console.log('Creando paciente demo...');
    const patientId = await ensureDemoPatient();
    console.log(`Paciente demo listo con ID: ${patientId}`);

    console.log('Generando cita programada...');
    const appointmentId = await ensureScheduledAppointment({ patientId, doctorId: doctorAnaId });
    console.log(`Cita programada ID: ${appointmentId}`);

    console.log('Asegurando visita para la cita programada...');
    const visitId = await ensureVisitForAppointment({
      appointmentId,
      patientId,
      doctorId: doctorAnaId,
      source: 'scheduled',
    });
    console.log(`Visita programada ID: ${visitId}`);

    console.log('Creando historial médico para la cita programada...');
    const historyId = await ensureMedicalHistoryEntry({
      patientId,
      doctorId: doctorAnaId,
      visitId,
      entryDate: new Date(),
      medicalInform: 'Control rutinario de seguimiento. Paciente sin cambios significativos.',
      treatment: 'Continuar con plan nutricional y ejercicio moderado.',
      recipe: null,
    });
    console.log(`Historial programado ID: ${historyId}`);

    console.log('Generando cita de emergencia...');
    const emergencyId = await ensureEmergencyAppointment({ patientId, doctorId: doctorLuisId });
    console.log(`Cita de emergencia ID: ${emergencyId}`);

    console.log('Asegurando visita para la cita de emergencia...');
    const emergencyVisitId = await ensureVisitForAppointment({
      appointmentId: emergencyId,
      patientId,
      doctorId: doctorLuisId,
      source: 'emergency',
    });
    console.log(`Visita de emergencia ID: ${emergencyVisitId}`);

    console.log('Creando historial médico para la cita de emergencia...');
    const emergencyHistoryId = await ensureMedicalHistoryEntry({
      patientId,
      doctorId: doctorLuisId,
      visitId: emergencyVisitId,
      entryDate: new Date(),
      medicalInform: 'Atención de emergencia por dolor torácico agudo.',
      treatment: 'Administración de analgésicos y monitoreo cardiaco.',
      recipe: 'Recetar nitroglicerina sublingual 0.4mg según indicación.',
    });
    console.log(`Historial emergencia ID: ${emergencyHistoryId}`);

    console.log('Datos semilla creados correctamente.');
  } catch (error) {
    console.error('Error durante la carga de datos semilla:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
    console.log('Pool de base de datos cerrado.');
  }
};

run();
