import { Router } from 'express';
import {
  createAppointment,
  findAppointmentById,
  listAppointments,
  listAppointmentsForDoctor,
} from './appointments.repository.js';
import { z } from 'zod';
import { authenticateUser } from '../auth/auth.middlewares.js';
import { ensurePatientFromRequest } from '../patients/patients.repository.js';

const listAppointmentsSchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

const listDoctorAppointmentsSchema = listAppointmentsSchema.extend({
  view: z.enum(['all', 'upcoming']).optional(),
});

const createSelfAppointmentSchema = z.object({
  scheduledFor: z.string().min(1, 'Debes indicar la fecha y hora de la cita'),
  reason: z.string().optional(),
  additionalNotes: z.string().optional(),
  patient: z
    .object({
      id: z.number().int().positive().optional(),
      fullName: z.string().min(1, 'El nombre del paciente es obligatorio').optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      documentId: z.string().optional(),
      birthDate: z.string().optional(),
      gender: z.string().optional(),
      age: z.number().int().nonnegative().optional(),
    })
    .refine((data) => Boolean(data.id || data.fullName), {
      message: 'Indica un paciente existente o el nombre para crear uno nuevo.',
      path: ['fullName'],
    }),
});

const router = Router();

router.post('/self', authenticateUser, async (req, res, next) => {
  try {
    if (req.user?.role !== 'doctor') {
      return res.status(403).json({ error: 'Solo los doctores pueden agendar citas directas.' });
    }

    const payload = createSelfAppointmentSchema.parse(req.body);

    const scheduledFor = new Date(payload.scheduledFor);
    if (Number.isNaN(scheduledFor.getTime())) {
      return res.status(400).json({ error: 'La fecha y hora indicada no es válida.' });
    }

    let patientId = payload.patient.id ?? null;
    let patientRecord = null;

    if (!patientId) {
      patientRecord = await ensurePatientFromRequest({
        client: null,
        fullName: payload.patient.fullName ?? '',
        phone: payload.patient.phone,
        email: payload.patient.email,
        documentId: payload.patient.documentId,
        birthDate: payload.patient.birthDate,
        gender: payload.patient.gender,
        age: payload.patient.age,
      });
      patientId = patientRecord?.id ?? null;
    }

    if (!patientId) {
      return res.status(400).json({ error: 'No se pudo determinar el paciente para esta cita.' });
    }

    const appointment = await createAppointment({
      patientId,
      doctorId: req.user.id,
      scheduledFor,
      reason: payload.reason ?? null,
      additionalNotes: payload.additionalNotes ?? null,
      channel: 'portal',
      priority: 'routine',
      status: 'confirmed',
      createdByUser: req.user.id,
      intakePayload: payload.patient.id ? null : JSON.stringify({ createdBy: 'doctor-self' }),
    });

    res.status(201).json({
      message: 'Cita creada y confirmada exitosamente.',
      appointment,
      patient: patientRecord,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/mine', authenticateUser, async (req, res, next) => {
  try {
    if (req.user?.role !== 'doctor') {
      return res.status(403).json({ error: 'Acceso restringido para este recurso.' });
    }

    const query = listDoctorAppointmentsSchema.parse(req.query);
    const fromDate = query.view === 'upcoming' ? new Date() : undefined;
    const appointments = await listAppointmentsForDoctor({
      doctorId: req.user.id,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
      fromDate,
    });

    res.json({ appointments });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const query = listAppointmentsSchema.parse(req.query);
    const appointments = await listAppointments(query);
    res.json({ appointments });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const appointment = await findAppointmentById({ id: req.params.id });
    if (!appointment) return res.status(404).json({ error: 'Cita no encontrada' });
    res.json({ appointment });
  } catch (error) {
    next(error);
  }
});

export default router;
