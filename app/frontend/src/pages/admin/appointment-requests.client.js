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

const state = {
  requests: [],
  activeRequest: null,
  activeAction: null,
};

const GENDER_LABELS = {
  male: 'Masculino',
  female: 'Femenino',
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

const renderTable = () => {
  if (!state.requests.length) {
    tableBody.innerHTML = `
      <tr class="admin-empty">
        <td colspan="6">No hay solicitudes registradas.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = state.requests
    .map((request) => {
      const preferredInfo = [
        formatDate(request.preferred_date),
        request.preferred_time_range ? `Franja: ${request.preferred_time_range}` : '',
      ]
        .filter(Boolean)
        .join(' · ');

      const statusClass = `admin-status admin-status--${request.status}`;

      return `
        <tr data-request-row="${request.id}">
          <td>
            <strong>${request.full_name}</strong>
            <div class="admin-patient-meta">
              ${request.document_id ? `<span>Documento: ${request.document_id}</span>` : ''}
              ${request.age ? `<span>Edad: ${request.age} años</span>` : ''}
              ${request.gender ? `<span>Género: ${GENDER_LABELS[request.gender] ?? request.gender}</span>` : ''}
              ${request.birth_date ? `<span>Nacimiento: ${formatDateOnly(request.birth_date)}</span>` : ''}
            </div>
          </td>
          <td>
            <div>${request.email}</div>
            <div>${request.phone ?? 'Sin teléfono'}</div>
          </td>
          <td>${request.symptoms ?? 'Sin descripción'}</td>
          <td>${preferredInfo || 'Sin preferencia'}</td>
          <td><span class="${statusClass}">${request.status}</span></td>
          <td>
            <div class="admin-row__actions">
              <button
                class="admin-button admin-button--primary"
                data-open-confirm="${request.id}"
                ${request.status !== 'pending' ? 'disabled' : ''}
              >
                Confirmar
              </button>
              <button
                class="admin-button admin-button--secondary"
                data-open-reschedule="${request.id}"
                ${request.status === 'rejected' ? 'disabled' : ''}
              >
                Reprogramar
              </button>
              <button
                class="admin-button admin-button--danger"
                data-open-reject="${request.id}"
                ${request.status === 'rejected' ? 'disabled' : ''}
              >
                Rechazar
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
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
    <tr class="admin-empty">
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

    state.requests = Array.isArray(data.requests) ? data.requests : [];
    renderTable();
    attachRowListeners();
  } catch (error) {
    tableBody.innerHTML = `
      <tr class="admin-empty">
        <td colspan="6">${error.message}</td>
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
