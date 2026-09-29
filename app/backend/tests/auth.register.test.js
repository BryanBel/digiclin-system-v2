import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';

// Sin base de datos ni correo: se mockean los modulos que tocan Postgres y el envio.
vi.mock('../src/db/pool.js', () => ({ default: { query: vi.fn() } }));

vi.mock('../src/modules/users/users.repository.js', () => ({
  default: {
    findByEmail: vi.fn(),
    addOne: vi.fn(),
    verifyOne: vi.fn(),
  },
}));

vi.mock('../src/modules/appointment_requests/appointment_requests.repository.js', () => ({
  assignUserToAppointmentRequests: vi.fn(),
  ensurePatientAndLinkRequestsForEmail: vi.fn(),
}));

vi.mock('../src/services/emailDispatcher.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({ provider: 'test' }),
}));

const { default: usersRepository } = await import('../src/modules/users/users.repository.js');
const { createAndConfigureApp } = await import('../app.js');

const validPatientProfile = {
  phone: '04141234567',
  documentId: 'V-12345678',
  birthDate: '1990-05-10',
  gender: 'female',
};

describe('POST /api/auth/register', () => {
  let app;

  beforeAll(async () => {
    process.env.EMAIL_VERIFICATION_SECRET = 'test-secret';
    app = await createAndConfigureApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.addOne.mockImplementation(async ({ email, role }) => ({
      id: 1,
      email,
      role,
    }));
  });

  it.each(['admin', 'doctor'])('ignora role=%s del cliente y crea un paciente', async (role) => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'intruso@example.com',
      password: 'secreto123',
      fullName: 'Intruso',
      role,
      patientProfile: validPatientProfile,
    });

    expect(res.status).toBe(201);
    expect(usersRepository.addOne).toHaveBeenCalledTimes(1);
    expect(usersRepository.addOne.mock.calls[0][0].role).toBe('patient');
  });

  it('crea paciente cuando no se envia role', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'paciente@example.com',
      password: 'secreto123',
      fullName: 'Paciente',
      patientProfile: validPatientProfile,
    });

    expect(res.status).toBe(201);
    expect(usersRepository.addOne.mock.calls[0][0].role).toBe('patient');
  });

  it('rechaza el registro sin datos de paciente', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'sinperfil@example.com',
      password: 'secreto123',
      role: 'doctor',
    });

    expect(res.status).toBe(400);
    expect(usersRepository.addOne).not.toHaveBeenCalled();
  });
});
