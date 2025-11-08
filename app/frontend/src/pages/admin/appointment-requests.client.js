import { BACK_ENDPOINT } from '../../config/endpoint.js';
import { createNotification } from '../../features/notifications/notification.js';

const tableBody = document.querySelector('[data-requests-body]');
const actionPanel = document.querySelector('[data-action-panel]');
const grid = document.querySelector('.admin-grid');
const actionTitle = document.querySelector('[data-action-title]');
const actionDescription = document.querySelector('[data-action-description]');
const actionName = document.querySelector('[data-action-name]');
const actionEmail = document.querySelector('[data-action-email]');
const actionPhone = document.querySelector('[data-action-phone]');
const actionDocument = document.querySelector('[data-action-document]');
const actionBirth = document.querySelector('[data-action-birth]');
const actionAge = document.querySelector('[data-action-age]');
const actionGender = document.querySelector('[data-action-gender]');
const actionForm = document.querySelector('#action-form');
const actionFeedback = document.querySelector('#action-feedback');
const cancelActionButton = document.querySelector('[data-cancel-action]');
const submitButton = document.querySelector('[data-action-submit]');
const fieldDoctor = document.querySelector('[data-field-doctor]');
const fieldSchedule = document.querySelector('[data-field-schedule]');
const doctorEmailInput = actionForm?.elements.namedItem('doctorEmail');
const scheduleInput = actionForm?.elements.namedItem('scheduledFor');
const noteInput = actionForm?.elements.namedItem('adminNote');

const ACTIONS = {
  CONFIRM: 'confirm',
  RESCHEDULE: 'reschedule',
  REJECT: 'rejected',
};

const TIME_RANGE_LABELS = {
  morning: 'Mañana',
  afternoon: 'Tarde',
  evening: 'Noche',
  night: 'Noche',
  anytime: 'Todo el día',
  day: 'Mañana',
};

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  reschedule: 'Reprogramada',
  rejected: 'Rechazada',
  completed: 'Realizada',
};

const BUTTON_VARIANTS = {
  confirmed: { label: 'Confirmada', className: 'admin-button--success' },
  completed: { label: 'Realizada', className: 'admin-button--success' },
  reschedule: { label: 'Reprogramada', className: 'admin-button--warning' },
  rejected: { label: 'Rechazada', className: 'admin-button--danger' },
};

const appointmentCache = new Map();

const escapeSelector = (value) => {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return String(value).replace(/[[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

const state = {
  requests: [],
  activeRequest: null,
  activeAction: null,
  highlightRequestPublicId: new URLSearchParams(window.location.search).get('request'),
};

const GENDER_LABELS = {
  male: 'Masculino',
  female: 'Femenino',
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
  if (!value) return 'Sin preferencia';
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

const formatDateOnly = (value) => {
  if (!value) return 'Sin registro';
  try {
    const date = new Date(value);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
};

const parseDateSafe = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const getPreferredInfo = (request) => {
  const preferredDateLabel = formatDate(request.preferred_date);
  const timeRange = request.preferred_time_range
    ? TIME_RANGE_LABELS[request.preferred_time_range] ?? request.preferred_time_range
    : '';
  return [preferredDateLabel, timeRange ? `Franja: ${timeRange}` : ''].filter(Boolean).join(' · ');
};

const fetchAppointmentDetails = async (appointmentId) => {
  if (!appointmentId) return null;
  const numericId = Number(appointmentId);
  const cacheKey = Number.isNaN(numericId) ? appointmentId : numericId;
  if (appointmentCache.has(cacheKey)) {
    return appointmentCache.get(cacheKey);
  }

  try {
    const response = await fetch(`${BACK_ENDPOINT}/api/appointments/${appointmentId}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      appointmentCache.set(cacheKey, null);
      return null;
    }
    const data = await response.json();
    const appointment = data?.appointment ?? null;
    appointmentCache.set(cacheKey, appointment);
    return appointment;
  } catch (error) {
    console.error('No se pudo obtener la cita vinculada:', error);
    appointmentCache.set(cacheKey, null);
    return null;
  }
};

const deriveRequestStatus = (request) => {
  const appointment = request.__appointment ?? null;
  const appointmentStatus = appointment?.status;
  if (appointmentStatus === 'cancelled') return 'rejected';
  if (appointmentStatus === 'completed') return 'completed';

  const baseStatus = request.status ?? 'pending';
  if (baseStatus === 'rejected') return 'rejected';

  const scheduledAt = parseDateSafe(appointment?.scheduled_for ?? request.scheduled_for);
  if (scheduledAt && scheduledAt.getTime() <= Date.now()) {
    return 'completed';
  }

  if (baseStatus === 'reschedule') return 'reschedule';
  if (baseStatus === 'confirmed') return 'confirmed';
  return baseStatus;
};

const buildConfirmButton = (request, derivedStatus) => {
  if (derivedStatus === 'pending') {
    return `
      <button
        type="button"
        class="admin-button admin-button--primary"
        data-open-confirm="${request.id}"
      >
        Confirmar
      </button>
    `;
  }

  const config = BUTTON_VARIANTS[derivedStatus];
  if (!config) {
    return `
      <button type="button" class="admin-button admin-button--primary" disabled>
        ${escapeHtml(STATUS_LABELS[derivedStatus] ?? 'No disponible')}
      </button>
    `;
  }

  return `
    <button type="button" class="admin-button ${config.className}" disabled>
      ${escapeHtml(config.label)}
    </button>
  `;
};

const buildRescheduleButton = (request, derivedStatus) => {
  if (derivedStatus === 'rejected' || derivedStatus === 'completed') {
    const label = derivedStatus === 'completed' ? 'No editable' : 'Rechazada';
    return `
      <button type="button" class="admin-button admin-button--secondary" disabled>${label}</button>
    `;
  }

  const isAlreadyRescheduled = derivedStatus === 'reschedule';
  const label = isAlreadyRescheduled ? 'Reprogramada' : 'Reprogramar';
  const attrs = isAlreadyRescheduled
    ? 'disabled'
    : `data-open-reschedule="${request.id}"`;

  return `
    <button type="button" class="admin-button admin-button--secondary" ${attrs}>
      ${label}
    </button>
  `;
};

const buildRejectButton = (request, derivedStatus) => {
  const isDisabled = derivedStatus === 'rejected' || derivedStatus === 'completed';
  const attrs = isDisabled ? 'disabled' : `data-open-reject="${request.id}"`;
  const label = isDisabled ? (derivedStatus === 'completed' ? 'No disponible' : 'Rechazada') : 'Rechazar';
  return `
    <button type="button" class="admin-button admin-button--danger" ${attrs}>
      ${label}
    </button>
  `;
};

const highlightFocusedRequest = () => {
  if (!state.highlightRequestPublicId) return;
  const row = tableBody.querySelector(
    `[data-request-public-id="${escapeSelector(state.highlightRequestPublicId)}"]`,
  );
  if (!row) return;
  row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  state.highlightRequestPublicId = null;
};

const renderTable = () => {
  if (!state.requests.length) {
    tableBody.innerHTML = `
      <tr class="records-empty">
        <td colspan="6">No hay solicitudes registradas.</td>
      </tr>
    `;
    return;
  }

  const highlightId = state.highlightRequestPublicId;

  tableBody.innerHTML = state.requests
    .map((request) => {
      const derivedStatus = deriveRequestStatus(request);
      const statusClass = `records-status records-status--${derivedStatus}`;
      const statusLabel = STATUS_LABELS[derivedStatus] ?? request.status ?? '-';
      const preferredInfo = getPreferredInfo(request);
      const confirmButton = buildConfirmButton(request, derivedStatus);
      const rescheduleButton = buildRescheduleButton(request, derivedStatus);
      const rejectButton = buildRejectButton(request, derivedStatus);
      const genderLabel = request.gender
        ? GENDER_LABELS[request.gender] ?? request.gender
        : null;
      const isHighlighted = Boolean(
        highlightId && request.public_id && request.public_id === highlightId,
      );
      const rowClasses = ['records-row', 'records-row--request'];
      if (isHighlighted) rowClasses.push('records-row--request-highlight');

      return `
        <tr
          class="${rowClasses.join(' ')}"
          data-request-row="${request.id}"
          ${request.public_id ? `data-request-public-id="${escapeHtml(request.public_id)}"` : ''}
        >
          <td>
            <div class="records-entry">
              <div class="records-entry-header">
                <span class="records-entry-date">${escapeHtml(request.full_name)}</span>
              </div>
              ${request.document_id ? `<span class="records-entry-line records-entry-line--muted">Documento: ${escapeHtml(request.document_id)}</span>` : ''}
              ${request.age ? `<span class="records-entry-line records-entry-line--muted">Edad: ${escapeHtml(request.age)} años</span>` : ''}
              ${genderLabel ? `<span class="records-entry-line records-entry-line--muted">Género: ${escapeHtml(genderLabel)}</span>` : ''}
              ${request.birth_date ? `<span class="records-entry-line records-entry-line--muted">Nacimiento: ${escapeHtml(formatDateOnly(request.birth_date))}</span>` : ''}
            </div>
          </td>
          <td>
            <div class="records-entry">
              <span class="records-entry-line">${escapeHtml(request.email)}</span>
              <span class="records-entry-line records-entry-line--muted">${escapeHtml(request.phone ?? 'Sin teléfono')}</span>
            </div>
          </td>
          <td>
            <div class="records-entry">
              <span class="records-pill records-pill--muted">${escapeHtml(request.symptoms ?? 'Sin descripción')}</span>
            </div>
          </td>
          <td>
            <div class="records-entry">
              <span class="records-entry-line">${escapeHtml(preferredInfo || 'Sin preferencia')}</span>
            </div>
          </td>
          <td>
            <div class="records-entry records-entry--status">
              <span class="${statusClass}">${escapeHtml(statusLabel)}</span>
            </div>
          </td>
          <td>
            <div class="admin-row__actions">
              ${confirmButton}
              ${rescheduleButton}
              ${rejectButton}
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  highlightFocusedRequest();
};

const toggleFieldsForAction = (action) => {
  if (!actionPanel) return;

  fieldDoctor.hidden = action !== ACTIONS.CONFIRM;
  fieldSchedule.hidden = action === ACTIONS.REJECT;

  if (doctorEmailInput) {
    doctorEmailInput.required = action === ACTIONS.CONFIRM;
    doctorEmailInput.value = '';
  }

  if (scheduleInput) {
    scheduleInput.required = action !== ACTIONS.REJECT;
    scheduleInput.value = '';
  }

  if (noteInput) {
    noteInput.value = '';
    noteInput.placeholder =
      action === ACTIONS.REJECT
        ? 'Describe por qué se rechaza la solicitud'
        : 'Describe el detalle para el paciente o staff';
  }

  switch (action) {
    case ACTIONS.CONFIRM:
      actionTitle.textContent = `Confirmar solicitud #${state.activeRequest?.id ?? ''}`;
      actionDescription.textContent =
        'Indica el correo del doctor y el horario para generar la cita y notificar al paciente.';
      submitButton.textContent = 'Confirmar cita';
      break;
    case ACTIONS.RESCHEDULE:
      actionTitle.textContent = `Reprogramar solicitud #${state.activeRequest?.id ?? ''}`;
      actionDescription.textContent =
        'Indica la nueva fecha propuesta y explica el motivo de la reprogramación.';
      submitButton.textContent = 'Guardar reprogramación';
      break;
    case ACTIONS.REJECT:
      actionTitle.textContent = `Rechazar solicitud #${state.activeRequest?.id ?? ''}`;
      actionDescription.textContent =
        'Explica la razón del rechazo para dejar seguimiento interno y notificar al paciente.';
      submitButton.textContent = 'Rechazar solicitud';
      break;
  }
};

const openActionPanel = (requestId, action) => {
  const request = state.requests.find((item) => item.id === Number(requestId));
  if (!request) return;

  state.activeRequest = request;
  state.activeAction = action;

  actionName.textContent = request.full_name;
  actionEmail.textContent = request.email;
  actionPhone.textContent = request.phone ?? 'Sin teléfono';
  actionDocument.textContent = request.document_id ?? 'Sin documento';
  actionBirth.textContent = formatDateOnly(request.birth_date);
  actionAge.textContent = request.age ? `${request.age} años` : 'Sin registro';
  actionGender.textContent = GENDER_LABELS[request.gender] ?? 'Sin registro';
  actionFeedback.textContent = '';
  actionFeedback.className = 'admin-feedback';
  actionForm?.reset();

  toggleFieldsForAction(action);
  actionPanel.hidden = false;
  grid?.classList.add('admin-grid--with-panel');
  actionPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const closeActionPanel = () => {
  state.activeRequest = null;
  state.activeAction = null;
  actionPanel.hidden = true;
  grid?.classList.remove('admin-grid--with-panel');
};

const attachRowListeners = () => {
  tableBody.querySelectorAll('[data-open-confirm]').forEach((button) => {
    button.addEventListener('click', () =>
      openActionPanel(button.dataset.openConfirm, ACTIONS.CONFIRM),
    );
  });

  tableBody.querySelectorAll('[data-open-reschedule]').forEach((button) => {
    button.addEventListener('click', () =>
      openActionPanel(button.dataset.openReschedule, ACTIONS.RESCHEDULE),
    );
  });

  tableBody.querySelectorAll('[data-open-reject]').forEach((button) => {
    button.addEventListener('click', () =>
      openActionPanel(button.dataset.openReject, ACTIONS.REJECT),
    );
  });
};

const loadRequests = async () => {
  tableBody.innerHTML = `
    <tr class="records-empty">
      <td colspan="6">Cargando solicitudes...</td>
    </tr>
  `;

  try {
    const response = await fetch(`${BACK_ENDPOINT}/api/appointment-requests`, {
      credentials: 'include',
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error ?? 'No se pudieron cargar las solicitudes');
    }

    const rawRequests = Array.isArray(data.requests) ? data.requests : [];
    const enrichedRequests = await Promise.all(
      rawRequests.map(async (request) => {
        const appointment = request.appointment_id
          ? await fetchAppointmentDetails(request.appointment_id)
          : null;
        return { ...request, __appointment: appointment };
      }),
    );

    state.requests = enrichedRequests;
    renderTable();
    attachRowListeners();
  } catch (error) {
    tableBody.innerHTML = `
      <tr class="records-empty records-empty--error">
        <td colspan="6">${escapeHtml(error.message)}</td>
      </tr>
    `;
    console.error('Error cargando solicitudes:', error);
  }
};

const handleActionSubmit = async (event) => {
  event.preventDefault();
  if (!state.activeRequest || !state.activeAction) return;

  const formData = new FormData(actionForm);
  const adminNote = formData.get('adminNote')?.toString().trim();

  if (!adminNote) {
    actionFeedback.textContent = 'Agrega una nota administrativa.';
    actionFeedback.className = 'admin-feedback admin-feedback--error';
    return;
  }

  let endpoint = '';
  let method = 'POST';
  let payload = {};

  switch (state.activeAction) {
    case ACTIONS.CONFIRM: {
      const doctorEmail = formData.get('doctorEmail')?.toString().trim();
      const scheduledFor = formData.get('scheduledFor');

      if (!doctorEmail) {
        actionFeedback.textContent = 'Indica el correo del doctor que atenderá la cita.';
        actionFeedback.className = 'admin-feedback admin-feedback--error';
        return;
      }

      if (!scheduledFor) {
        actionFeedback.textContent = 'Indica la fecha y hora de la cita.';
        actionFeedback.className = 'admin-feedback admin-feedback--error';
        return;
      }

      endpoint = `${BACK_ENDPOINT}/api/appointment-requests/${state.activeRequest.id}/confirm`;
      payload = {
        doctorEmail,
        scheduledFor,
        adminNote,
      };
      break;
    }
    case ACTIONS.RESCHEDULE: {
      const scheduledFor = formData.get('scheduledFor');
      if (!scheduledFor) {
        actionFeedback.textContent = 'Indica la nueva fecha y hora propuesta.';
        actionFeedback.className = 'admin-feedback admin-feedback--error';
        return;
      }

      endpoint = `${BACK_ENDPOINT}/api/appointment-requests/${state.activeRequest.id}/reschedule`;
      payload = {
        scheduledFor,
        adminNote,
      };
      break;
    }
    case ACTIONS.REJECT: {
      endpoint = `${BACK_ENDPOINT}/api/appointment-requests/${state.activeRequest.id}`;
      method = 'PATCH';
      payload = {
        status: ACTIONS.REJECT,
        adminNote,
      };
      break;
    }
    default:
      return;
  }

  actionFeedback.textContent = '';
  actionFeedback.className = 'admin-feedback';
  submitButton.disabled = true;

  const labels = {
    [ACTIONS.CONFIRM]: 'Confirmar cita',
    [ACTIONS.RESCHEDULE]: 'Guardar reprogramación',
    [ACTIONS.REJECT]: 'Rechazar solicitud',
  };
  submitButton.textContent = 'Guardando...';

  try {
    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data?.error ?? 'No se pudo completar la acción');

    createNotification({
      title: 'Acción registrada',
      description: data?.message ?? 'La solicitud fue actualizada correctamente.',
      type: 'success',
    });

    actionFeedback.textContent = data?.message ?? 'La solicitud fue actualizada.';
    actionFeedback.className = 'admin-feedback admin-feedback--success';

    await loadRequests();
    setTimeout(closeActionPanel, 1200);
  } catch (error) {
    actionFeedback.textContent = error.message;
    actionFeedback.className = 'admin-feedback admin-feedback--error';

    createNotification({
      title: 'No se pudo completar la acción',
      description: error.message,
      type: 'error',
    });
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = labels[state.activeAction] ?? 'Guardar cambios';
  }
};

actionForm?.addEventListener('submit', handleActionSubmit);
cancelActionButton?.addEventListener('click', closeActionPanel);

loadRequests();
