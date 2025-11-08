import { useEffect } from 'react';
import { BACK_ENDPOINT } from '../../config/endpoint.js';

export default function useNavigationClient() {
  useEffect(() => {
    const nav = document.querySelector('[data-nav]');
    if (!nav) return;

    const loginLink = nav.querySelector('[data-nav-link="login"]');
    const signupLink = nav.querySelector('[data-nav-link="signup"]');
    const appointmentsLink = nav.querySelector('[data-nav-link="appointments"]');
    const adminLink = nav.querySelector('[data-nav-link="admin"]');
    const emailTag = nav.querySelector('[data-nav-email]');
    const logoutButton = nav.querySelector('[data-action="logout"]');
    const patientsLink = nav.querySelector('[data-nav-link="patients"]');
    const doctorLink = nav.querySelector('[data-nav-link="doctor"]');
    const medicalHistoryLink = nav.querySelector('[data-nav-link="medical-history"]');
    const patientAppointmentsLink = nav.querySelector('[data-nav-link="patient-appointments"]');
    const patientHistoryLink = nav.querySelector('[data-nav-link="patient-history"]');

    const show = (element) => element?.removeAttribute('hidden');
    const hide = (element) => element?.setAttribute('hidden', '');

    const applyState = (user) => {
      hide(adminLink);
      hide(appointmentsLink);
      hide(patientsLink);
      hide(doctorLink);
      hide(medicalHistoryLink);
      hide(patientAppointmentsLink);
      hide(patientHistoryLink);

      if (user) {
        hide(loginLink);
        hide(signupLink);
        show(logoutButton);
        if (emailTag) {
          emailTag.textContent = user.email ?? '';
          show(emailTag);
        }

        const role = user.role ?? '';
        if (role === 'admin') {
          show(adminLink);
          show(appointmentsLink);
          show(patientsLink);
          show(medicalHistoryLink);
        } else if (role === 'doctor') {
          show(doctorLink);
          show(medicalHistoryLink);
        } else if (role === 'patient') {
          show(patientAppointmentsLink);
          show(patientHistoryLink);
        }
      } else {
        show(loginLink);
        show(signupLink);
        hide(logoutButton);
        if (emailTag) {
          emailTag.textContent = '';
          hide(emailTag);
        }
      }
    };

    const initialUser = nav.dataset.userEmail
      ? { email: nav.dataset.userEmail, role: nav.dataset.userRole }
      : null;
    applyState(initialUser);

    const fetchUser = async () => {
      try {
        const response = await fetch(`${BACK_ENDPOINT}/api/auth/user`, {
          credentials: 'include',
        });
        if (response.status === 401 || response.status === 403) {
          applyState(null);
          return;
        }
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error?.error ?? 'No se pudo obtener el usuario actual');
        }
        const user = await response.json();
        applyState(user);
      } catch (error) {
        console.warn('No se pudo obtener el usuario actual.', error);
        applyState(null);
      }
    };

    if (!initialUser) {
      fetchUser();
    }

    const handleLogout = async (event) => {
      event.preventDefault();
      try {
        await fetch(`${BACK_ENDPOINT}/api/auth/logout`, {
          method: 'GET',
          credentials: 'include',
        });
      } catch (error) {
        console.error('Fallo al cerrar sesión', error);
      } finally {
        applyState(null);
        window.location.href = '/login';
      }
    };

    logoutButton?.addEventListener('click', handleLogout);

    return () => {
      logoutButton?.removeEventListener('click', handleLogout);
    };
  }, []);
}