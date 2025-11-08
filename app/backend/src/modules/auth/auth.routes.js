import express from 'express';
import {
  loginUserRouteSchema,
  registerUserRouteSchema,
  verifyEmailRouteSchema,
} from './auth.routes.schemas.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import usersRepository from '../users/users.repository.js';
import { ErrorWithStatus } from '../../utils/errorTypes.js';
import { authenticateUser } from './auth.middlewares.js';
import { sendEmail } from '../../services/emailDispatcher.js';
import {
  assignUserToAppointmentRequests,
  ensurePatientAndLinkRequestsForEmail,
} from '../appointment_requests/appointment_requests.repository.js';
import { buildBackendUrl, buildFrontendUrl } from '../../utils/urlHelpers.js';
const authRouter = express.Router();

const ROLE_DISPLAY_LABEL = {
  doctor: 'Doctor',
  patient: 'Paciente',
  admin: 'Admin',
};

const formatRecipient = ({ email, fullName, role }) => {
  if (!email) return '';
  const label = ROLE_DISPLAY_LABEL[role] ?? ROLE_DISPLAY_LABEL.doctor;
  const hasName = typeof fullName === 'string' && fullName.trim().length > 0;
  const displayName = hasName ? `${label} ${fullName.trim()}` : label;
  return `${displayName} <${email}>`;
};

authRouter.post('/register', async (req, res) => {
  const parsedPayload = registerUserRouteSchema.body.parse(req.body);
  const { email, password, fullName, role, patientProfile } = parsedPayload;

  const normalizedFullName = fullName?.trim() || null;
  const normalizedRole = role ?? 'doctor';
  const normalizedPatientProfile =
    normalizedRole === 'patient'
      ? {
          phone: patientProfile?.phone?.trim() || null,
          documentId: patientProfile?.documentId?.trim() || null,
          birthDate: patientProfile?.birthDate ?? null,
          gender: patientProfile?.gender ?? null,
          age:
            typeof patientProfile?.age === 'number' && Number.isFinite(patientProfile.age)
              ? patientProfile.age
              : null,
        }
      : null;

  const userExists = await usersRepository.findByEmail({ email });
  if (userExists) throw new ErrorWithStatus(400, 'User already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = await usersRepository.addOne({
    email,
    passwordHash,
    fullName: normalizedFullName,
    role: normalizedRole,
  });

  try {
    if (normalizedRole === 'patient') {
      await assignUserToAppointmentRequests({ email, userId: newUser.id });
      await ensurePatientAndLinkRequestsForEmail({
        email,
        fullName: normalizedFullName,
        phone: normalizedPatientProfile?.phone ?? undefined,
        documentId: normalizedPatientProfile?.documentId ?? undefined,
        birthDate: normalizedPatientProfile?.birthDate ?? undefined,
        gender: normalizedPatientProfile?.gender ?? undefined,
        age: normalizedPatientProfile?.age ?? undefined,
      });
    }
  } catch (linkError) {
    console.error('Error linking user with appointment requests:', {
      email,
      userId: newUser.id,
      message: linkError.message,
    });
  }

  const verificationToken = jwt.sign(
    { id: newUser.id, email: newUser.email },
    process.env.EMAIL_VERIFICATION_SECRET,
    { expiresIn: '1h' },
  );

  const verificationUrl = buildBackendUrl(`/api/auth/verify-email/${verificationToken}`);

  try {
    const toEmail = formatRecipient({
      email,
      fullName: normalizedFullName,
      role: normalizedRole,
    });
    const textContent = [
      'Gracias por registrarte. Por favor, verifica tu correo electrónico en el siguiente enlace:',
      verificationUrl,
    ].join('\n');

    const htmlContent = `<p>Gracias por registrarte. Por favor, haz clic en el siguiente enlace para verificar tu correo electrónico:</p><a href="${verificationUrl}">Verificar correo</a>`;

    const { provider } = await sendEmail({
      to: toEmail,
      subject: 'Verifica tu correo',
      text: textContent,
      html: htmlContent,
    });

    console.log(`Verification email sent successfully to ${email} via ${provider}`);
    res.status(201).json({
      message: 'Usuario registrado exitosamente. Por favor, verifica tu correo electrónico.',
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new ErrorWithStatus(500, 'Error al enviar el correo de verificación');
  }
});

authRouter.get('/verify-email/:token', async (req, res) => {
  const { token } = verifyEmailRouteSchema.params.parse(req.params);

  try {
    const decodedToken = jwt.verify(token, process.env.EMAIL_VERIFICATION_SECRET);
    await usersRepository.verifyOne({ id: decodedToken.id });
    res.redirect(buildFrontendUrl('/login'));
  } catch {
    res.redirect(buildFrontendUrl('/email-verification-failed'));
  }
});

authRouter.post('/login', async (req, res) => {
  const body = loginUserRouteSchema.body.parse(req.body);
  const user = await usersRepository.findByEmail({ email: body.email });
  if (!user) throw new ErrorWithStatus(400, 'Usuario o contraseña invalidos');
  const isPasswordValid = await bcrypt.compare(body.password, user.passwordhash);
  if (!isPasswordValid) throw new ErrorWithStatus(400, 'Usuario o contraseña invalidos');
  if (!user.verify_email)
    throw new ErrorWithStatus(
      403,
      'Por favor, verifica tu correo electrónico antes de iniciar sesión.',
    );
  const accessToken = jwt.sign(
    { id: user.id, email: user.email },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '1d' },
  );

  res.cookie('access_token', accessToken, {
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
    secure: process.env.NODE_ENV === 'prod',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'prod' ? 'none' : 'lax',
  });

  res.status(200).json({ id: user.id, email: user.email, role: user.role });
});

authRouter.get('/user', authenticateUser, async (req, res) => {
  const { user } = req;

  const loggedUser = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  return res.status(200).json(loggedUser);
});

authRouter.get('/logout', async (req, res) => {
  const accessToken = req.cookies.access_token;
  if (!accessToken) return res.sendStatus(200);
  res.clearCookie('access_token');
  return res.sendStatus(200);
});

export default authRouter;
