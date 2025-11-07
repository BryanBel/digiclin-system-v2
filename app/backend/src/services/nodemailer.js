import { createTransport } from 'nodemailer';

const nodemailerService = createTransport({
  host: 'smtp.gmail.com',
  port: 587, // Puerto 587 con STARTTLS (más compatible con hostings)
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  requireTLS: true, // Fuerza el uso de TLS
  pool: true,
  maxConnections: 1,
  rateDelta: 1000,
  rateLimit: 5,
  connectionTimeout: 10000,
  greetingTimeout: 5000,
  socketTimeout: 15000,
});

export default nodemailerService;
