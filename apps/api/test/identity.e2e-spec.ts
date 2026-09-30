import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, ORIGIN, PASSWORD, type TestApp } from './utils/test-app.js';

const application = {
  specialties: ['Medicina Interna'],
  qualifications: [
    { type: 'MPPS', number: '123456' },
    {
      type: 'Colegio de Médicos',
      number: '7890',
      issuer: 'Colegio de Médicos del Distrito Capital',
    },
  ],
};

const invite = (as: ReturnType<TestApp['browser']>, email: string, role: string) =>
  as.post('/api/auth/organization/invite-member', { email, role });

describe('identidad y acceso', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
  });

  afterEach(async () => {
    await t.close();
  });

  /** Sigue el enlace del correo de invitacion: crea la cuenta y acepta. */
  const acceptAs = async (email: string, name: string) => {
    const invitationId = t.mailer
      .link(email, /Invitación/)
      .pathname.split('/')
      .pop()!;
    const as = await t.signUp(name, email);
    await as.post('/api/auth/organization/accept-invitation', { invitationId }).expect(200);
    return as;
  };

  describe('cuentas', () => {
    it('/api/me sin sesion responde 401', async () => {
      await t.browser().get('/api/me').expect(401);
    });

    it('una cuenta nueva no puede entrar hasta confirmar su correo', async () => {
      const as = t.browser();
      await as
        .post('/api/auth/sign-up/email', {
          name: 'Ana',
          email: 'ana@example.com',
          password: PASSWORD,
        })
        .expect(200);

      await t
        .browser()
        .post('/api/auth/sign-in/email', { email: 'ana@example.com', password: PASSWORD })
        .expect(403);

      await t.follow(as, t.mailer.link('ana@example.com', /Confirma tu correo/));
      const me = await as.get('/api/me').expect(200);

      expect(me.body).toMatchObject({
        user: { email: 'ana@example.com', emailVerified: true, twoFactorEnabled: false },
        clinic: null,
        practitioner: null,
        access: { admin: false, doctor: false, patient: true },
      });
    });

    it('registrarse con un correo existente no lo revela, pero avisa al dueno del correo', async () => {
      await t.signUp('Ana', 'ana@example.com');
      const newcomer = await t
        .browser()
        .post('/api/auth/sign-up/email', {
          name: 'Otra persona',
          email: 'ana@example.com',
          password: 'otra-contrasena-larga-123',
        })
        .expect(200);

      expect(newcomer.body.token).toBeNull();
      const notice = t.mailer.last('ana@example.com', /Intento de registro/);
      expect(notice.text).toContain(`${ORIGIN}/recuperar`);
    });

    it('rechaza contrasenas de menos de 12 caracteres', async () => {
      const res = await t.browser().post('/api/auth/sign-up/email', {
        name: 'Ana',
        email: 'ana@example.com',
        password: 'corta123',
      });
      expect(res.status).toBe(400);
    });

    it('un "role" en el cuerpo del registro no da ningun acceso (regresion de la v2)', async () => {
      const as = t.browser();
      await as.post('/api/auth/sign-up/email', {
        name: 'Intruso',
        email: 'intruso@example.com',
        password: PASSWORD,
        role: 'admin',
      });
      await t.createClinic();
      await t.follow(as, t.mailer.link('intruso@example.com', /Confirma tu correo/));

      const me = await as.get('/api/me').expect(200);
      expect(me.body.access).toEqual({ admin: false, doctor: false, patient: true });
      await as.get('/api/clinic/practitioners').expect(403);
    });
  });

  describe('medico que se registra solo', () => {
    it('solicita, queda pendiente y opera solo cuando la clinica lo aprueba', async () => {
      const { owner } = await t.createClinic();
      const doctor = await t.signUp('Luis Médico', 'luis@example.com');

      const submitted = await doctor
        .put('/api/practitioners/me/application', application)
        .expect(200);
      expect(submitted.body).toMatchObject({
        status: 'pending',
        specialties: ['Medicina Interna'],
      });
      expect(submitted.body.qualifications[0]).toEqual({
        type: 'MPPS',
        number: '123456',
        country: 'VE',
      });

      let me = await doctor.get('/api/me').expect(200);
      expect(me.body.practitioner).toEqual({ status: 'pending' });
      expect(me.body.access.doctor).toBe(false);

      const pending = await owner.get('/api/clinic/practitioners?status=pending').expect(200);
      expect(pending.body).toHaveLength(1);
      expect(pending.body[0]).toMatchObject({ email: 'luis@example.com', status: 'pending' });

      await owner.post(`/api/clinic/practitioners/${pending.body[0].userId}/approve`).expect(204);

      me = await doctor.get('/api/me').expect(200);
      expect(me.body.practitioner).toEqual({ status: 'approved' });
      expect(me.body.access).toEqual({ admin: false, doctor: true, patient: true });
      expect(me.body.clinic).toMatchObject({ name: 'Clínica de Prueba', roles: ['doctor'] });
      expect(t.mailer.last('luis@example.com', /aprobado/).text).toContain(`${ORIGIN}/medico`);
    });

    it('una solicitud rechazada lleva el motivo por correo y se puede reenviar', async () => {
      const { owner } = await t.createClinic();
      const doctor = await t.signUp('Luis Médico', 'luis@example.com');
      const { body } = await doctor.put('/api/practitioners/me/application', application);

      await owner
        .post(`/api/clinic/practitioners/${body.userId}/reject`, { reason: 'corto' })
        .expect(400);
      await owner
        .post(`/api/clinic/practitioners/${body.userId}/reject`, {
          reason: 'El número de MPPS no coincide con el registro.',
        })
        .expect(204);

      expect(t.mailer.last('luis@example.com', /solicitud/).text).toContain(
        'El número de MPPS no coincide con el registro.',
      );
      expect((await doctor.get('/api/practitioners/me')).body).toMatchObject({
        status: 'rejected',
      });

      await doctor.put('/api/practitioners/me/application', application).expect(200);
      expect((await doctor.get('/api/practitioners/me')).body).toMatchObject({
        status: 'pending',
        reviewNote: null,
      });
    });

    it('un medico aprobado no puede reescribir sus datos verificados', async () => {
      const { owner } = await t.createClinic();
      const doctor = await t.signUp('Luis Médico', 'luis@example.com');
      const { body } = await doctor.put('/api/practitioners/me/application', application);
      await owner.post(`/api/clinic/practitioners/${body.userId}/approve`).expect(204);

      await doctor.put('/api/practitioners/me/application', application).expect(409);
    });

    it('una solicitud ya revisada no se aprueba dos veces', async () => {
      const { owner } = await t.createClinic();
      const doctor = await t.signUp('Luis Médico', 'luis@example.com');
      const { body } = await doctor.put('/api/practitioners/me/application', application);

      await owner.post(`/api/clinic/practitioners/${body.userId}/approve`).expect(204);
      await owner.post(`/api/clinic/practitioners/${body.userId}/approve`).expect(409);
    });

    it('la duena que tambien atiende conserva su rol y suma el de medica', async () => {
      const { owner } = await t.createClinic();
      const { body } = await owner
        .put('/api/practitioners/me/application', application)
        .expect(200);
      await owner.post(`/api/clinic/practitioners/${body.userId}/approve`).expect(204);

      const me = await owner.get('/api/me').expect(200);
      expect(me.body.clinic.roles).toEqual(['owner', 'doctor']);
      expect(me.body.access).toEqual({ admin: true, doctor: true, patient: true });
    });
  });

  describe('permisos de administracion', () => {
    it('un paciente o un medico no administran la clinica', async () => {
      const { owner } = await t.createClinic();
      const patient = await t.signUp('Paciente', 'paciente@example.com');
      await patient.get('/api/clinic/practitioners').expect(403);

      const doctor = await t.signUp('Luis Médico', 'luis@example.com');
      const { body } = await doctor.put('/api/practitioners/me/application', application);
      await owner.post(`/api/clinic/practitioners/${body.userId}/approve`).expect(204);
      await doctor.get('/api/clinic/practitioners').expect(403);
      await doctor.post(`/api/clinic/practitioners/${body.userId}/approve`).expect(403);
    });

    it('un id que no es UUID responde 400, no 500', async () => {
      const { owner } = await t.createClinic();
      await owner.post('/api/clinic/practitioners/no-es-uuid/approve').expect(400);
    });
  });

  describe('invitaciones y gobierno de la clinica', () => {
    it('un medico invitado por la clinica queda aprobado al aceptar', async () => {
      const { owner } = await t.createClinic();
      await invite(owner, 'invitada@example.com', 'doctor').expect(200);

      const doctor = await acceptAs('invitada@example.com', 'Invitada Médica');
      const me = await doctor.get('/api/me').expect(200);
      expect(me.body.practitioner).toEqual({ status: 'approved' });
      expect(me.body.access.doctor).toBe(true);
    });

    it('solo el dueno invita socios; los socios invitan medicos', async () => {
      const { owner } = await t.createClinic();
      await invite(owner, 'socio@example.com', 'admin').expect(200);
      const partner = await acceptAs('socio@example.com', 'Socio');

      expect((await partner.get('/api/me')).body.access.admin).toBe(true);
      await invite(partner, 'otro-socio@example.com', 'admin').expect(403);
      await invite(partner, 'medico@example.com', 'doctor').expect(200);
    });

    it('nadie entra como dueno por invitacion', async () => {
      const { owner } = await t.createClinic();
      await invite(owner, 'x@example.com', 'owner').expect(403);
    });

    it('un socio no cambia roles ni retira miembros', async () => {
      const { owner } = await t.createClinic();
      await invite(owner, 'socio@example.com', 'admin').expect(200);
      const partner = await acceptAs('socio@example.com', 'Socio');
      await invite(owner, 'medico@example.com', 'doctor').expect(200);
      await acceptAs('medico@example.com', 'Médico');

      const members = await owner.get('/api/auth/organization/list-members').expect(200);
      const doctorMember = members.body.members.find(
        (m: { user: { email: string } }) => m.user.email === 'medico@example.com',
      );

      const promote = await partner.post('/api/auth/organization/update-member-role', {
        memberId: doctorMember.id,
        role: 'admin',
      });
      expect(promote.status).toBe(403);

      // Better Auth responde 401 (no 403) a este rechazo; lo que importa es que no ocurre.
      const remove = await partner.post('/api/auth/organization/remove-member', {
        memberIdOrEmail: doctorMember.id,
      });
      expect(remove.body.code).toBe('YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER');

      const after = await owner.get('/api/auth/organization/list-members').expect(200);
      const stillThere = after.body.members.find((m: { id: string }) => m.id === doctorMember.id);
      expect(stillThere).toMatchObject({ role: 'doctor' });
    });
  });
});
