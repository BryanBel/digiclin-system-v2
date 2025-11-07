import { Router } from 'express';
import {
  confirmAppointmentRequest,
  createAppointmentRequest,
  findAppointmentRequestById,
  listAppointmentRequests,
  updateAppointmentRequestStatus,
} from './appointment_requests.repository.js';
import {
  confirmAppointmentRequestSchema,
  createAppointmentRequestSchema,
  listAppointmentRequestsSchema,
  rescheduleAppointmentRequestSchema,
  updateAppointmentRequestSchema,
} from './appointment_requests.routes.schemas.js';
import { APPOINTMENT_REQUEST_STATUS } from './appointment_requests.constants.js';
import resend from '../../services/resend.js';
import usersRepository from '../users/users.repository.js';
import { buildFrontendUrl } from '../../utils/urlHelpers.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const query = listAppointmentRequestsSchema.parse(req.query);
    const requests = await listAppointmentRequests(query);
    res.json({ requests });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = createAppointmentRequestSchema.parse(req.body);
    const { request, linkToken } = await createAppointmentRequest(payload);

    const signupLink = buildFrontendUrl('/signup', { email: payload.email });
    const loginLink = buildFrontendUrl('/login');
    const linkAppointmentUrl = linkToken
      ? buildFrontendUrl('/link-appointment', { token: linkToken })
      : null;

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    await resend.emails.send({
      from: fromEmail,
      to: payload.email,
      subject: 'Solicitud de cita recibida',
      text: [
        `Hola ${payload.fullName},`,
        '',
        'Hemos recibido tu solicitud de cita.',
        `Crea tu cuenta para seguir tu solicitud aquí: ${signupLink}`,
        linkAppointmentUrl
          ? `Si ya tienes cuenta, confirma y vincula tu cita aquí: ${linkAppointmentUrl}`
          : `Si ya tienes cuenta, inicia sesión aquí: ${loginLink}`,
        '',
        'El equipo de DigiClin.',
      ].join('\n'),
    });

    res.status(201).json({
      message: 'Solicitud registrada correctamente.',
      requestId: request.public_id,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const body = updateAppointmentRequestSchema.parse(req.body);
    const request = await updateAppointmentRequestStatus({
      id: req.params.id,
      status: body.status,
      adminNote: body.adminNote,
    });

    if (!request) return res.status(404).json({ error: 'Solicitud no encontrada' });

    res.json({ request });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/confirm', async (req, res, next) => {
  try {
    const payload = confirmAppointmentRequestSchema.parse(req.body);
    const doctorEmail = payload.doctorEmail.trim().toLowerCase();
    const doctor = await usersRepository.findByEmail({ email: doctorEmail });

    if (!doctor) {
      return res.status(404).json({ error: 'No se encontró un doctor con ese correo' });
    }

    const { request, appointment } = await confirmAppointmentRequest({
      id: req.params.id,
      doctorId: doctor.id,
      scheduledFor: payload.scheduledFor,
      adminNote: payload.adminNote,
      createdByUser: res.locals.user?.id ?? null,
    });

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const scheduledForText =
      payload.scheduledFor instanceof Date
        ? payload.scheduledFor.toISOString()
        : payload.scheduledFor;

    await resend.emails.send({
      from: fromEmail,
      to: request.email,
      subject: 'Tu cita ha sido confirmada',
      text: [
        `Hola ${request.full_name},`,
        '',
        'Tu cita fue confirmada correctamente.',
        `Fecha y hora: ${scheduledForText}`,
        `Doctor asignado: ${doctorEmail}`,
        '',
        `Puedes consultar tu cita aquí: ${buildFrontendUrl('/login')}`,
        '',
        'El equipo de DigiClin.',
      ].join('\n'),
    });

    res.json({
      message: 'Solicitud confirmada y cita creada.',
      request,
      appointment,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/reschedule', async (req, res, next) => {
  try {
    const payload = rescheduleAppointmentRequestSchema.parse(req.body);

    const request = await updateAppointmentRequestStatus({
      id: req.params.id,
      status: APPOINTMENT_REQUEST_STATUS.RESCHEDULE,
      adminNote: payload.adminNote,
    });

    if (!request) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    // Más adelante puedes enviar correo aquí.
    res.json({
      message: 'Solicitud marcada para reprogramación.',
      request,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const request = await findAppointmentRequestById({ id: req.params.id });
    if (!request) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json({ request });
  } catch (error) {
    next(error);
  }
});

export default router;
