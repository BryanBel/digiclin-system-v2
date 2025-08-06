import express from 'express';
import { createUserRouteSchema } from './users.routes.schemas.js';
import bcrypt from 'bcrypt';
import usersRepository from './users.repository.js';
import jwt from 'jsonwebtoken';
import nodemailerService from '../../services/nodemailer.js';
const usersRouter = express.Router();

usersRouter.post('/', async (req, res) => {
  const body = createUserRouteSchema.body.parse(req.body);
  const passwordHash = await bcrypt.hash(body.password, 10);
  const newUser = await usersRepository.addOne({
    email: body.email,
    passwordHash,
  });
  //verificar correo con nodemailer
  const token = jwt.sign(
    { id: newUser.id, email: newUser.email },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: '1m',
    },
  );
  await nodemailerService.sendMail({
    from: process.env.EMAIL_USER,
    to: body.email,
    subject: 'verifica tu correo',
    html: `<a href= "http:localhost:4321/verify/${token}">Verifica tu correo</a>`,
  });
  res.sendStatus(200);
});

export default usersRouter;
