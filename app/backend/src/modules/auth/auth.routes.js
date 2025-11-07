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
import resend from '../../services/resend.js';
import {
  assignUserToAppointmentRequests,
  ensurePatientAndLinkRequestsForEmail,
} from '../appointment_requests/appointment_requests.repository.js';
const authRouter = express.Router();

authRouter.post('/register', async (req, res) => {
  const { email, password, fullName, role } = registerUserRouteSchema.body.parse(req.body);

  const normalizedFullName = fullName?.trim() || null;
  const normalizedRole = role ?? 'doctor';

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

  const backendUrl = process.env.BACKEND_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';
  const verificationUrl = `${backendUrl}/api/auth/verify-email/${verificationToken}`;

  try {
    const toEmail = normalizedFullName ? `${normalizedFullName} <${email}>` : email;
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: toEmail,
      subject: 'Verifica tu correo',
      html: `<p>Gracias por registrarte. Por favor, haz clic en el siguiente enlace para verificar tu correo electrónico:</p><a href="${verificationUrl}">Verificar correo</a>`,
    });

    console.log(`Verification email sent successfully to ${email}`);
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
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4321';

  try {
    const decodedToken = jwt.verify(token, process.env.EMAIL_VERIFICATION_SECRET);
    await usersRepository.verifyOne({ id: decodedToken.id });
    res.redirect(`${frontendUrl}/login`);
  } catch {
    res.redirect(`${frontendUrl}/email-verification-failed`);
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
