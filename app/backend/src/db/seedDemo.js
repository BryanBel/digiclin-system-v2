import bcrypt from 'bcrypt';
import pool from './pool.js';

/**
 * Cuenta demo publica, para que quien visite el demo (por ejemplo, un reclutador) entre sin
 * registrarse. Las credenciales estan en los README a proposito: no son un secreto.
 *
 * Solo paciente, nunca admin ni doctor: en la v2 un doctor ve a todos los pacientes, asi que
 * un doctor publico expondria los datos de quienes se registraron en el demo.
 *
 * El correo es .test (dominio reservado, RFC 2606): no recibe correo, asi que nadie puede
 * tomar la cuenta pidiendo un enlace. Volver a ejecutar el script restaura la demo: la
 * contrasena, la ficha y los datos ficticios.
 */
const DEMO_EMAIL = 'paciente.demo@digiclin.test';
const DEMO_PASSWORD = 'demo-digiclin-2026';
const DEMO_NAME = 'Paciente Demo';

if (process.env.SEED_PASSWORD && process.env.SEED_PASSWORD === DEMO_PASSWORD) {
  console.error('SEED_PASSWORD no puede ser la contrasena publica de la demo.');
  process.exit(1);
}

const upsertDemoUser = async (client) => {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const { rows } = await client.query(
    `INSERT INTO users (full_name, email, passwordhash, role, verify_email)
     VALUES ($1, $2, $3, 'patient', true)
     ON CONFLICT (email) DO UPDATE
       SET full_name = EXCLUDED.full_name,
           passwordhash = EXCLUDED.passwordhash,
           role = 'patient',
           verify_email = true,
           updated_at = NOW()
     RETURNING id`,
    [DEMO_NAME, DEMO_EMAIL, passwordHash],
  );
  return rows[0].id;
};

/** Ficha con datos ficticios; se restaura aunque alguien la haya cambiado desde el demo. */
const upsertDemoPatient = async (client) => {
  const values = [DEMO_NAME, '0412-0000000', 'V-00000000', '1990-01-01', 'female', 'phone'];
  const existing = await client.query('SELECT id FROM patients WHERE LOWER(email) = $1 LIMIT 1', [
    DEMO_EMAIL,
  ]);

  if (existing.rows.length > 0) {
    const { id } = existing.rows[0];
    await client.query(
      `UPDATE patients
          SET full_name = $1, phone = $2, document_id = $3, birth_date = $4, gender = $5,
              age = DATE_PART('year', AGE($4::date))::int, preferred_channel = $6,
              updated_at = NOW()
        WHERE id = $7`,
      [...values, id],
    );
    return id;
  }

  const { rows } = await client.query(
    `INSERT INTO patients (full_name, phone, document_id, birth_date, gender, age,
                           preferred_channel, email)
     VALUES ($1, $2, $3, $4, $5, DATE_PART('year', AGE($4::date))::int, $6, $7)
     RETURNING id`,
    [...values, DEMO_EMAIL],
  );
  return rows[0].id;
};

const findDemoDoctor = async (client) => {
  const { rows } = await client.query(
    `SELECT id FROM users WHERE role = 'doctor' AND email LIKE '%@digiclin.test'
      ORDER BY created_at LIMIT 1`,
  );
  return rows[0]?.id ?? null;
};

/** Al menos una entrada de historial y una cita proxima, para que la demo no se vea vacia. */
const ensureDemoClinicalData = async (client, { patientId, userId, doctorId }) => {
  const history = await client.query(
    'SELECT 1 FROM medical_history WHERE patient_id = $1 LIMIT 1',
    [patientId],
  );
  if (history.rows.length === 0) {
    await client.query(
      `INSERT INTO medical_history (entry_date, medical_inform, treatment, recipe, patient_id, doctor_id)
       VALUES (NOW() - INTERVAL '30 days', $1, $2, $3, $4, $5)`,
      [
        'Control de hipertensión arterial. TA 128/82 mmHg, FC 74 lpm. Paciente asintomática. (Datos ficticios de demostración.)',
        'Mantener tratamiento, dieta baja en sodio y actividad física moderada. Control en 3 meses.',
        'Losartán 50 mg: 1 tableta vía oral cada 24 horas.',
        patientId,
        doctorId,
      ],
    );
  }

  const upcoming = await client.query(
    'SELECT 1 FROM appointments WHERE patient_id = $1 AND scheduled_for > NOW() LIMIT 1',
    [patientId],
  );
  if (upcoming.rows.length === 0) {
    await client.query(
      `INSERT INTO appointments (patient_id, doctor_id, scheduled_for, reason, channel, priority,
                                 status, created_by_user, intake_payload)
       VALUES ($1, $2, DATE_TRUNC('day', NOW()) + INTERVAL '7 days 10 hours',
               'Control de hipertensión arterial', 'portal', 'routine', 'confirmed', $3, '{}'::jsonb)`,
      [patientId, doctorId, userId],
    );
  }
};

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userId = await upsertDemoUser(client);
    const patientId = await upsertDemoPatient(client);
    // Las solicitudes que dejen los visitantes con la cuenta demo se limpian en cada restauracion.
    const removed = await client.query(
      'DELETE FROM appointment_requests WHERE LOWER(email) = $1 AND user_id = $2',
      [DEMO_EMAIL, userId],
    );
    const doctorId = await findDemoDoctor(client);
    await ensureDemoClinicalData(client, { patientId, userId, doctorId });
    await client.query('COMMIT');

    console.log(`Cuenta demo lista: ${DEMO_EMAIL} (paciente, verificada).`);
    console.log(`Solicitudes de visitantes eliminadas: ${removed.rowCount}.`);
    if (!doctorId)
      console.log('Aviso: no hay doctores semilla; la demo queda sin doctor asignado.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('No se pudo preparar la cuenta demo:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();
