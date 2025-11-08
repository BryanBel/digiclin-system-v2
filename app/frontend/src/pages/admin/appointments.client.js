import { BACK_ENDPOINT } from '../../config/endpoint.js';

const tableBody = document.querySelector('[data-appointments-body]');

const STATUS_LABELS = {
  confirmed: 'Confirmada',
  reschedule: 'Reprogramada',
  rejected: 'Rechazada',
  cancelled: 'Rechazada',
  pending: 'Pendiente',
  completed: 'Realizada',
};

const state = {
  appointments: [],
  requestByAppointmentId: new Map(),
};

const escapeHtml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

const parseDateSafe = (value) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const deriveAppointmentStatus = (appointment) => {
  const linkedRequest = state.requestByAppointmentId.get(Number(appointment.id)) ?? null;
  const requestStatus = linkedRequest?.status ?? null;
  const baseStatus = appointment.status ?? 'pending';

  if (requestStatus === 'rejected' || baseStatus === 'cancelled') {
    return 'rejected';
  }

  if (requestStatus === 'reschedule') {
    return 'reschedule';
  }

  if (baseStatus === 'completed') {
    return 'completed';
  }

  if (requestStatus === 'confirmed' || baseStatus === 'confirmed') {
    const scheduledAt = parseDateSafe(appointment.scheduled_for);
    if (scheduledAt && scheduledAt.getTime() <= Date.now()) {
      return 'completed';
    }
    return 'confirmed';
  }

  const scheduledAt = parseDateSafe(appointment.scheduled_for);
  if (scheduledAt && scheduledAt.getTime() <= Date.now()) {
    return 'completed';
  }

  return baseStatus ?? 'pending';
};

const renderTable = (appointments) => {
  if (!appointments.length) {
    tableBody.innerHTML = `
      <tr class="records-empty">
        <td colspan="5">No hay citas registradas.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = appointments
    .map((appointment) => {
      const derivedStatus = deriveAppointmentStatus(appointment);
      const statusClass = derivedStatus
        ? `records-status records-status--${derivedStatus}`
        : 'records-status';
      const statusLabel = STATUS_LABELS[derivedStatus] ?? STATUS_LABELS[appointment.status] ?? appointment.status ?? '-';
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

      const patientMetaMarkup = patientMeta.length
        ? patientMeta
            .map((item) => `<span class="records-entry-line records-entry-line--muted">${escapeHtml(item)}</span>`)
            .join('')
        : '';

      return `
        <tr class="records-row records-row--appointment">
          <td>
            <div class="records-entry">
              <div class="records-entry-header">
                <span class="records-entry-date">${escapeHtml(patientName)}</span>
              </div>
              ${patientMetaMarkup}
            </div>
          </td>
          <td>
            <div class="records-entry">
              <span class="records-entry-line">${escapeHtml(doctorDisplay)}</span>
            </div>
          </td>
          <td>
            <div class="records-entry">
              <span class="records-entry-line">${escapeHtml(formatDate(appointment.scheduled_for))}</span>
            </div>
          </td>
          <td>
            <div class="records-entry">
              <span class="records-pill records-pill--muted">${escapeHtml(appointment.reason ?? '-')}</span>
            </div>
          </td>
          <td>
            <div class="records-entry records-entry--status">
              <span class="${statusClass}">${escapeHtml(statusLabel)}</span>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
};

const loadAppointments = async () => {
  tableBody.innerHTML = `
    <tr class="records-empty">
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
    state.appointments = appointments;

    try {
      const requestsResponse = await fetch(
        `${BACK_ENDPOINT}/api/appointment-requests?limit=250`,
        {
          credentials: 'include',
        },
      );

      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        const requestList = Array.isArray(requestsData.requests) ? requestsData.requests : [];
        state.requestByAppointmentId = requestList.reduce((acc, request) => {
          if (request?.appointment_id) {
            const appointmentId = Number(request.appointment_id);
            if (!acc.has(appointmentId)) {
              acc.set(appointmentId, request);
            }
          }
          return acc;
        }, new Map());
      } else {
        state.requestByAppointmentId = new Map();
      }
    } catch (error) {
      console.warn('No se pudieron cargar las solicitudes vinculadas a las citas:', error);
      state.requestByAppointmentId = new Map();
    }

    renderTable(state.appointments);
  } catch (error) {
    tableBody.innerHTML = `
      <tr class="records-empty records-empty--error">
        <td colspan="5">${error.message}</td>
      </tr>
    `;
    console.error('Error cargando citas:', error);
  }
};

loadAppointments();
