import { BACK_ENDPOINT } from '../../config/endpoint.js';
import { createNotification } from '../../features/notifications/notification.js';

const upcomingBody = document.querySelector('[data-doctor-upcoming-body]');
const historyBody = document.querySelector('[data-doctor-history-body]');
const feedbackMessage = document.querySelector('[data-doctor-feedback]');
const upcomingSummary = document.querySelector('[data-doctor-upcoming-summary]');
const historySummary = document.querySelector('[data-doctor-history-summary]');
const statusFilter = document.querySelector('[data-doctor-status-filter]');
const refreshButton = document.querySelector('[data-doctor-refresh]');
const quickForm = document.querySelector('#doctor-quick-form');
const quickFeedback = document.querySelector('[data-quick-feedback]');
const quickSubmit = document.querySelector('[data-quick-submit]');

const STATUS_LABELS = {
  confirmed: 'Cita planificada',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
  completed: 'Finalizada',
};

const state = {
  appointments: [],
  loading: false,
  status: 'all',
};

const formatDateTime = (value) => {
  if (!value) return '-';
  try {
    const date = new Date(value);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.warn('No se pudo formatear la fecha', error);
    return value;
  }
};

const formatStatus = (status) => STATUS_LABELS[status] ?? status ?? '-';

const buildPatientMeta = (appointment) => {
  const meta = [];
  if (appointment.patient_document_id) {
    meta.push(`Documento: ${appointment.patient_document_id}`);
  }
  if (typeof appointment.patient_age === 'number') {
    meta.push(`Edad: ${appointment.patient_age} años`);
  }
  if (appointment.patient_gender) {
    const genderLabel =
      appointment.patient_gender === 'female'
        ? 'Femenino'
        : appointment.patient_gender === 'male'
        ? 'Masculino'
        : appointment.patient_gender;
    meta.push(`Género: ${genderLabel}`);
  }
  if (appointment.patient_phone) {
    meta.push(`Teléfono: ${appointment.patient_phone}`);
  } else if (appointment.legacy_phone) {
    meta.push(`Teléfono: ${appointment.legacy_phone}`);
  }
  return meta;
};

const buildHistoryUrl = (appointment) => {
  if (!appointment.patient_id) return null;
  const params = new URLSearchParams({
    patientId: appointment.patient_id,
  });
  if (appointment.reason) params.set('reason', appointment.reason);
  if (appointment.scheduled_for) params.set('scheduledFor', appointment.scheduled_for);
  params.set('visitId', appointment.id);
  return `/admin/medical-history?${params.toString()}`;
};

const createHistoryButton = (appointment) => {
  const historyUrl = buildHistoryUrl(appointment);
  if (!historyUrl) return '';
  return `
    <button
      type="button"
      class="admin-button admin-button--secondary"
      data-register-history
      data-history-url="${historyUrl}"
    >
      Registrar historial
    </button>
  `;
};

const createDetailsLink = (appointment) => {
  const historyUrl = buildHistoryUrl(appointment);
  if (!historyUrl) {
    return '<span class="doctor-note">Sin paciente asignado</span>';
  }
  return `
    <a class="doctor-history-link" href="${historyUrl}">
      Completar historial
    </a>
  `;
};

const renderTable = (target, appointments, emptyMessage, renderAction) => {
  if (!target) return;
  if (!appointments.length) {
    target.innerHTML = `
      <tr class="admin-empty">
        <td colspan="5">${emptyMessage}</td>
      </tr>
    `;
    return;
  }

  target.innerHTML = appointments
    .map((appointment) => {
      const meta = buildPatientMeta(appointment);
      const statusClass = appointment.status
        ? `admin-status admin-status--${appointment.status}`
        : 'admin-status';
      const patientName = appointment.patient_name ?? appointment.legacy_name ?? 'Sin asignar';
      const statusLabel = formatStatus(appointment.status);
      const actionMarkup = renderAction(appointment);
      const actionCell = actionMarkup
        ? `<div class="doctor-actions">${actionMarkup}</div>`
        : '<span class="doctor-note">Sin acciones</span>';

      return `
        <tr class="doctor-row">
          <td>
            <div class="admin-cell admin-cell--person">
              <strong>${patientName}</strong>
              ${meta.length ? `<div class="doctor-appointment-meta">${meta.map((item) => `<span>${item}</span>`).join('')}</div>` : ''}
            </div>
          </td>
          <td>
            <div class="admin-cell">
              ${formatDateTime(appointment.scheduled_for)}
            </div>
          </td>
          <td>
            <div class="admin-cell">
              <p class="doctor-text">${appointment.reason ?? '-'}</p>
            </div>
          </td>
          <td>
            <div class="admin-cell">
              <span class="${statusClass}">${statusLabel}</span>
            </div>
          </td>
          <td>
            <div class="admin-cell">
              ${actionCell}
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
};

const attachActionHandlers = () => {
  document.querySelectorAll('[data-register-history]').forEach((button) => {
    button.addEventListener('click', () => {
      const url = button.dataset.historyUrl;
      if (!url) {
        createNotification({
          title: 'No se pudo abrir el historial',
          description: 'Asigná un paciente a la cita antes de registrar el historial clínico.',
          type: 'error',
        });
        return;
      }
      window.location.href = url;
    });
  });
};

const partitionAppointments = (appointments) => {
  const now = new Date();
  const upcoming = [];
  const history = [];

  appointments.forEach((appointment) => {
    const scheduled = appointment.scheduled_for ? new Date(appointment.scheduled_for) : null;
    const isUpcoming =
      appointment.status === 'confirmed' || appointment.status === 'pending'
        ? scheduled && scheduled >= now
        : scheduled && scheduled >= now && appointment.status !== 'cancelled';

    if (isUpcoming) {
      upcoming.push(appointment);
    } else {
      history.push(appointment);
    }
  });

  upcoming.sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime());
  history.sort((a, b) => new Date(b.scheduled_for).getTime() - new Date(a.scheduled_for).getTime());

  return { upcoming, history };
};

const setFeedback = (message, type = 'info') => {
  if (!feedbackMessage) return;
  if (!message) {
    feedbackMessage.hidden = true;
    feedbackMessage.textContent = '';
    feedbackMessage.className = 'doctor-feedback';
    return;
  }

  feedbackMessage.hidden = false;
  feedbackMessage.textContent = message;
  feedbackMessage.className = `doctor-feedback doctor-feedback--${type}`;
};

const renderAppointments = () => {
  const { upcoming, history } = partitionAppointments(state.appointments);

  if (upcomingSummary) {
    upcomingSummary.textContent = upcoming.length
      ? `${upcoming.length} cita${upcoming.length === 1 ? '' : 's'} próximamente`
      : 'Sin próximas citas';
  }

  if (historySummary) {
    historySummary.textContent = history.length
      ? `${history.length} cita${history.length === 1 ? '' : 's'} recientes`
      : 'Sin citas recientes';
  }

  renderTable(
    upcomingBody,
    upcoming,
    'No tienes citas próximas por el momento.',
    (appointment) => createHistoryButton(appointment)
  );

  renderTable(
    historyBody,
    history,
    'Sin registros recientes. Asegúrate de completar el historial clínico después de cada consulta.',
    (appointment) => createDetailsLink(appointment)
  );

  attachActionHandlers();
};

const buildQueryString = () => {
  const params = new URLSearchParams({ view: 'all', limit: '100' });
  if (state.status !== 'all') {
    params.set('status', state.status);
  }
  return params.toString();
};

const loadAppointments = async () => {
  if (state.loading) return;
  state.loading = true;
  setFeedback('Actualizando tus citas...', 'info');

  renderTable(
    upcomingBody,
    [],
    'Cargando...',
    () => ''
  );
  renderTable(
    historyBody,
    [],
    'Cargando...',
    () => ''
  );

  try {
    const query = buildQueryString();
    const response = await fetch(`${BACK_ENDPOINT}/api/appointments/mine?${query}`, {
      credentials: 'include',
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error ?? 'No se pudieron cargar tus citas');
    }

    state.appointments = Array.isArray(data.appointments) ? data.appointments : [];
    renderAppointments();
    setFeedback('', 'info');
  } catch (error) {
    console.error('Error cargando citas del doctor:', error);
    setFeedback(error.message ?? 'No se pudieron obtener las citas.', 'error');

    upcomingBody.innerHTML = `
      <tr class="admin-empty">
        <td colspan="5">${error.message ?? 'Error al cargar las citas'}</td>
      </tr>
    `;
    historyBody.innerHTML = `
      <tr class="admin-empty">
        <td colspan="5">${error.message ?? 'Error al cargar las citas'}</td>
      </tr>
    `;
  } finally {
    state.loading = false;
  }
};

statusFilter?.addEventListener('change', () => {
  state.status = statusFilter.value;
  loadAppointments();
});

refreshButton?.addEventListener('click', () => {
  loadAppointments();
});

const setQuickFeedback = (message, type = 'info') => {
  if (!quickFeedback) return;
  quickFeedback.textContent = message ?? '';
  quickFeedback.className = 'doctor-quick__feedback';
  if (message && type !== 'info') {
    quickFeedback.classList.add(`doctor-quick__feedback--${type}`);
  }
};

const handleQuickSubmit = async (event) => {
  event.preventDefault();
  if (!quickForm || !quickSubmit) return;

  const formData = new FormData(quickForm);
  const scheduledRaw = formData.get('scheduledFor')?.toString();
  const fullName = formData.get('fullName')?.toString().trim() ?? '';

  if (!scheduledRaw) {
    setQuickFeedback('Indica la fecha y hora de la consulta.', 'error');
    return;
  }

  const scheduledDate = new Date(scheduledRaw);
  if (Number.isNaN(scheduledDate.getTime())) {
    setQuickFeedback('La fecha seleccionada no es válida. Revisa el formato.', 'error');
    return;
  }

  const reason = formData.get('reason')?.toString().trim() ?? '';
  if (!reason) {
    setQuickFeedback('Describe el motivo de la consulta.', 'error');
    return;
  }

  if (!fullName) {
    setQuickFeedback('El nombre del paciente es obligatorio.', 'error');
    return;
  }

  const payload = {
    scheduledFor: scheduledDate.toISOString(),
    reason,
    additionalNotes: formData.get('additionalNotes')?.toString().trim() || undefined,
    patient: {
      fullName,
      documentId: formData.get('documentId')?.toString().trim() || undefined,
      email: formData.get('email')?.toString().trim() || undefined,
      phone: formData.get('phone')?.toString().trim() || undefined,
    },
  };

  setQuickFeedback('Creando cita...', 'info');
  quickSubmit.disabled = true;
  const originalLabel = quickSubmit.textContent;
  quickSubmit.textContent = 'Agendando...';

  try {
    const response = await fetch(`${BACK_ENDPOINT}/api/appointments/self`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error ?? 'No se pudo crear la cita.');
    }

    setQuickFeedback(data?.message ?? 'Cita creada exitosamente.', 'success');
    quickForm.reset();
    await loadAppointments();
  } catch (error) {
    setQuickFeedback(error.message, 'error');
    console.error('Error creando cita directa:', error);
  } finally {
    quickSubmit.disabled = false;
    quickSubmit.textContent = originalLabel;
  }
};

quickForm?.addEventListener('submit', handleQuickSubmit);

loadAppointments();
