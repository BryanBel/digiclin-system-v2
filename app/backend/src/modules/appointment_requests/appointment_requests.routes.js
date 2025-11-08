import { Router } from 'express';
import {
  confirmAppointmentRequest,
  createAppointmentRequest,
  findAppointmentRequestById,
  listAppointmentRequests,
  updateAppointmentRequestStatus,
  assignUserToAppointmentRequests,
  ensurePatientAndLinkRequestsForEmail,
  findAppointmentRequestByLinkToken,
  consumeAppointmentLinkToken,
} from './appointment_requests.repository.js';
import {
  confirmAppointmentRequestSchema,
  createAppointmentRequestSchema,
  listAppointmentRequestsSchema,
  rescheduleAppointmentRequestSchema,
  updateAppointmentRequestSchema,
  linkAppointmentTokenSchema,
} from './appointment_requests.routes.schemas.js';
import { APPOINTMENT_REQUEST_STATUS } from './appointment_requests.constants.js';
import { sendEmail } from '../../services/emailDispatcher.js';
import usersRepository from '../users/users.repository.js';
import { buildFrontendUrl } from '../../utils/urlHelpers.js';

const router = Router();

const ROLE_DISPLAY_LABEL = {
  patient: 'Paciente',
  doctor: 'Doctor',
  admin: 'Admin',
};

const formatRecipient = ({ email, fullName, role = 'patient' }) => {
  if (!email) return '';

  const label = ROLE_DISPLAY_LABEL[role] ?? ROLE_DISPLAY_LABEL.patient;
  const hasName = typeof fullName === 'string' && fullName.trim().length > 0;
  const normalizedName = hasName ? `${label} ${fullName.trim()}` : label;

  return `${normalizedName} <${email}>`;
};

router.get('/', async (req, res, next) => {
  try {
    const query = listAppointmentRequestsSchema.parse(req.query);
    const requests = await listAppointmentRequests(query);
    res.json({ requests });
  } catch (error) {
    next(error);
  }
});

router.get('/link/:token', async (req, res, next) => {
  try {
    const { token } = linkAppointmentTokenSchema.parse({ token: req.params.token });
    const request = await findAppointmentRequestByLinkToken({ token });

    if (!request) {
      return res.status(404).json({ error: 'El enlace no es válido o ya fue utilizado.' });
    }

    const expiresAt = request.token_expires_at ? new Date(request.token_expires_at) : null;
    if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
      return res.status(410).json({
        error: 'El enlace ha expirado. Solicita una nueva vinculación.',
      });
    }

    res.json({
      request: {
        fullName: request.full_name,
        email: request.email,
        status: request.status,
        createdAt: request.created_at,
      },
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/link', async (req, res, next) => {
  try {
    const { token } = linkAppointmentTokenSchema.parse(req.body);
    const user = res.locals.user;
    if (!user) {
      return res.status(401).json({ error: 'Inicia sesión para vincular tu solicitud.' });
    }

    const result = await consumeAppointmentLinkToken({ token, userId: user.id });

    if (result.status === 'NOT_FOUND') {
      return res.status(404).json({ error: 'El enlace no es válido o ya fue utilizado.' });
    }

    if (result.status === 'EXPIRED') {
      return res.status(410).json({
        error: 'El enlace ha expirado. Solicita una nueva vinculación.',
      });
    }

    if (result.status === 'ALREADY_LINKED_OTHER') {
      return res.status(409).json({
        error:
          'Este enlace ya fue utilizado por otra cuenta. Contacta a soporte si necesitas ayuda.',
      });
    }

    const linkedRequest = result.request;

    if (linkedRequest?.email) {
      await assignUserToAppointmentRequests({ email: linkedRequest.email, userId: user.id });
      await ensurePatientAndLinkRequestsForEmail({
        email: linkedRequest.email,
        fullName: linkedRequest.full_name ?? undefined,
      });
    }

    res.json({
      message:
        result.status === 'ALREADY_LINKED'
          ? 'La solicitud ya estaba vinculada a tu cuenta.'
          : 'Tu solicitud se vinculó correctamente a tu cuenta.',
      status: result.status,
      request: linkedRequest
        ? {
            publicId: linkedRequest.public_id,
            status: linkedRequest.status,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const isPatientUser = res.locals.user?.role === 'patient';
    const incomingBody = {
      ...req.body,
      isExistingPatient: isPatientUser ? true : req.body?.isExistingPatient,
    };

    const payload = createAppointmentRequestSchema.parse(incomingBody);
    const { request, linkToken } = await createAppointmentRequest(payload);

    if (res.locals.user?.id) {
      await assignUserToAppointmentRequests({
        email: payload.email,
        userId: res.locals.user.id,
      });
    }

    await ensurePatientAndLinkRequestsForEmail({
      email: payload.email,
      fullName: payload.fullName,
      phone: payload.phone,
      documentId: payload.documentId,
      birthDate: payload.birthDate,
      gender: payload.gender,
      age: payload.age,
    });

    const signupLink = buildFrontendUrl('/signup', { email: payload.email });
    const loginLink = buildFrontendUrl('/login');
    const linkAppointmentUrl = linkToken
      ? buildFrontendUrl('/link-appointment', { token: linkToken })
      : null;

    const recipient = formatRecipient({
      email: payload.email,
      fullName: payload.fullName,
      role: 'patient',
    });

    await sendEmail({
      to: recipient,
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
      wasLinkedToUser: Boolean(res.locals.user?.id),
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

    const scheduledForText =
      payload.scheduledFor instanceof Date
        ? payload.scheduledFor.toISOString()
        : payload.scheduledFor;

    const recipient = formatRecipient({
      email: request.email,
      fullName: request.full_name,
      role: 'patient',
    });

    await sendEmail({
      to: recipient,
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
