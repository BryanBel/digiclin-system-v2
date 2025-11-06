import { BACK_ENDPOINT } from '../../config/endpoint.js';

const tableBody = document.querySelector('[data-appointments-body]');

const STATUS_LABELS = {
  confirmed: 'Cita planificada',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
  completed: 'Finalizada',
};

const formatDate = (value) => {
  if (!value) return '-';
  try {
    const date = new Date(value);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const renderTable = (appointments) => {
  if (!appointments.length) {
    tableBody.innerHTML = `
      <tr class="admin-empty">
        <td colspan="5">No hay citas registradas.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = appointments
    .map((appointment) => {
      const statusClass = appointment.status
        ? `admin-status admin-status--${appointment.status}`
        : 'admin-status';
      const statusLabel = STATUS_LABELS[appointment.status] ?? appointment.status ?? '-';
      const doctorDisplay =
        appointment.doctor_email ?? appointment.doctor_name ?? appointment.doctor_id ?? '-';
      const patientName = appointment.patient_name ?? appointment.legacy_name ?? 'Sin asignar';
      const patientMeta = [];
      if (appointment.patient_document_id) {
        patientMeta.push(`Documento: ${appointment.patient_document_id}`);
      }
      if (typeof appointment.patient_age === 'number') {
        patientMeta.push(`Edad: ${appointment.patient_age} años`);
      }
      if (appointment.patient_gender) {
        const genderLabel =
          appointment.patient_gender === 'female'
            ? 'Femenino'
            : appointment.patient_gender === 'male'
            ? 'Masculino'
            : appointment.patient_gender;
        patientMeta.push(`Género: ${genderLabel}`);
      }
      if (appointment.patient_phone) {
        patientMeta.push(`Teléfono: ${appointment.patient_phone}`);
      }
      if (!patientMeta.length && appointment.legacy_phone) {
        patientMeta.push(`Teléfono: ${appointment.legacy_phone}`);
      }

      return `
        <tr>
          <td>
            <div>${patientName}</div>
            ${patientMeta.length ? `<div class="admin-patient-meta">${patientMeta.map((item) => `<span>${item}</span>`).join('')}</div>` : ''}
          </td>
          <td>${doctorDisplay}</td>
          <td>${formatDate(appointment.scheduled_for)}</td>
          <td>${appointment.reason ?? '-'}</td>
          <td><span class="${statusClass}">${statusLabel}</span></td>
        </tr>
      `;
    })
    .join('');
};

const loadAppointments = async () => {
  tableBody.innerHTML = `
    <tr class="admin-empty">
      <td colspan="5">Cargando citas...</td>
    </tr>
  `;

  try {
    const response = await fetch(`${BACK_ENDPOINT}/api/appointments`, {
      credentials: 'include',
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error ?? 'No se pudieron cargar las citas');
    }

    const appointments = Array.isArray(data.appointments) ? data.appointments : [];
    renderTable(appointments);
  } catch (error) {
    tableBody.innerHTML = `
      <tr class="admin-empty">
        <td colspan="5">${error.message}</td>
      </tr>
    `;
    console.error('Error cargando citas:', error);
  }
};

loadAppointments();
