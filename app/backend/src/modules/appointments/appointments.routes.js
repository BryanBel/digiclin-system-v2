import express from 'express';
import {
  createEmergencyAppointment,
  createScheduledAppointment,
  listAppointments,
} from './appointments.repository.js';
import {
  createEmergencyAppointmentSchema,
  createScheduledAppointmentSchema,
} from './appointments.routes.schemas.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const {
      status,
      priority,
      channel,
      doctor_id: doctorId,
      patient_id: patientId,
      from,
      to,
      limit,
    } = req.query;

    const appointments = await listAppointments({
      status,
      priority,
      channel,
      doctor_id: doctorId,
      patient_id: patientId,
      from,
      to,
      limit,
    });

    res.json({ appointments });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = createScheduledAppointmentSchema.body.parse(req.body);

    const appointment = await createScheduledAppointment({
      ...payload,
      patient_id: payload.patient_id ?? null,
      patient: payload.patient
        ? {
            ...payload.patient,
            birth_date: payload.patient.birth_date ?? null,
          }
        : null,
    });

    res.status(201).json({ appointment });
  } catch (error) {
    next(error);
  }
});

router.post('/emergency', async (req, res, next) => {
  try {
    const payload = createEmergencyAppointmentSchema.body.parse(req.body);
    const result = await createEmergencyAppointment(payload);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
