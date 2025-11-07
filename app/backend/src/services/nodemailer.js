import { createTransport } from 'nodemailer';
const nodemailerService = createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true,
  maxConnections: 1,
  rateDelta: 1000,
  rateLimit: 5,
  connectionTimeout: 10000,
  greetingTimeout: 5000,
  socketTimeout: 15000,
});

export default nodemailerService;
