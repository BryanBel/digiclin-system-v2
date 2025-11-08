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
const existingPatientToggle = document.querySelector('[data-doctor-existing-toggle]');
const prefillFeedback = document.querySelector('[data-doctor-prefill-feedback]');
const patientIdField = quickForm ? quickForm.querySelector('[data-doctor-patient-id]') : null;
const emailField = quickForm ? quickForm.querySelector("input[name='email']") : null;
const phoneField = quickForm ? quickForm.querySelector("input[name='phone']") : null;
const documentField = quickForm ? quickForm.querySelector("input[name='documentId']") : null;
const fullNameField = quickForm ? quickForm.querySelector("input[name='fullName']") : null;

const STATUS_LABELS = {
  confirmed: 'Cita planificada',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
  completed: 'Finalizada',
};

const ICONS = {
  calendar:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>',
  clock:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>',
  clipboard:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1V5a2 2 0 0 1 2-2z"/><path d="M9 3v1a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V3"/></svg>',
  user:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></svg>',
  mail:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>',
  phone:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2.03z"/></svg>',
  info:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  note:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h9l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M13 3v5h5"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>',
  status:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
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

const state = {
  appointments: [],
  loading: false,
  status: 'all',
};

const patientPrefillCache = new Map();
const PATIENT_LOOKUP_ENDPOINT = `${BACK_ENDPOINT}/api/patients/lookup`;
let resolvedPatient = null;

const setPrefillFeedback = (message = '', variant = null) => {
  if (!prefillFeedback) return;
  prefillFeedback.textContent = message ?? '';
  prefillFeedback.className = 'doctor-quick__prefill-feedback';

  if (variant === 'error') {
    prefillFeedback.classList.add('doctor-quick__prefill-feedback--error');
  } else if (variant === 'success') {
    prefillFeedback.classList.add('doctor-quick__prefill-feedback--success');
  }
};

const clearExistingPatientState = ({ keepValues = true } = {}) => {
  resolvedPatient = null;

  if (patientIdField instanceof HTMLInputElement) {
    patientIdField.value = '';
  }

  if (!keepValues) {
    if (fullNameField instanceof HTMLInputElement) fullNameField.value = '';
    if (emailField instanceof HTMLInputElement) emailField.value = '';
    if (phoneField instanceof HTMLInputElement) phoneField.value = '';
    if (documentField instanceof HTMLInputElement) documentField.value = '';
  }

  setPrefillFeedback();
};

const applyExistingPatient = (patient) => {
  if (!patient || typeof patient !== 'object') return;
  resolvedPatient = patient;

  if (patientIdField instanceof HTMLInputElement && typeof patient.id === 'number') {
    patientIdField.value = String(patient.id);
  }

  if (fullNameField instanceof HTMLInputElement && typeof patient.fullName === 'string' && patient.fullName.trim()) {
    fullNameField.value = patient.fullName.trim();
  }

  if (documentField instanceof HTMLInputElement && typeof patient.documentId === 'string' && patient.documentId.trim()) {
    documentField.value = patient.documentId.trim();
  }

  if (emailField instanceof HTMLInputElement && typeof patient.email === 'string' && patient.email.trim()) {
    emailField.value = patient.email.trim();
  }

  if (phoneField instanceof HTMLInputElement && typeof patient.phone === 'string' && patient.phone.trim()) {
    phoneField.value = patient.phone.trim();
  }
};

const fetchPatientProfile = async (email) => {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  if (patientPrefillCache.has(normalized)) {
    return patientPrefillCache.get(normalized);
  }

  const lookupUrl = `${PATIENT_LOOKUP_ENDPOINT}?email=${encodeURIComponent(normalized)}`;
  const response = await fetch(lookupUrl, { credentials: 'include' });

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const parsedBody = isJson
    ? await response.json().catch(() => ({}))
    : await response.text().catch(() => '');

  if (!response.ok) {
    const message =
      (typeof parsedBody === 'string' && parsedBody) ||
      parsedBody?.error ||
      parsedBody?.message ||
      'No se pudo obtener la información del paciente.';
    throw new Error(message);
  }

  const patient = parsedBody?.patient ?? null;
  if (patient) {
    patientPrefillCache.set(normalized, patient);
  }
  return patient;
};

const handleExistingToggleChange = async () => {
  if (!existingPatientToggle) return;

  if (!existingPatientToggle.checked) {
    clearExistingPatientState({ keepValues: true });
    return;
  }

  const emailValue =
    emailField instanceof HTMLInputElement ? emailField.value.trim().toLowerCase() : '';

  if (!emailValue) {
    setPrefillFeedback('Ingresa el correo del paciente antes de buscarlo.', 'error');
    existingPatientToggle.checked = false;
    emailField?.focus();
    return;
  }

  try {
    existingPatientToggle.disabled = true;
    setPrefillFeedback('Buscando paciente registrado...', null);

    const patient = await fetchPatientProfile(emailValue);

    if (!patient) {
      setPrefillFeedback('No encontramos un paciente con ese correo.', 'error');
      existingPatientToggle.checked = false;
      clearExistingPatientState({ keepValues: true });
      return;
    }

    applyExistingPatient(patient);
    setPrefillFeedback('Datos del paciente cargados.', 'success');
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudo obtener la información del paciente.';
    setPrefillFeedback(message, 'error');
    existingPatientToggle.checked = false;
    clearExistingPatientState({ keepValues: true });
  } finally {
    existingPatientToggle.disabled = false;
  }
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
    meta.push({ icon: ICONS.clipboard, text: `Documento: ${appointment.patient_document_id}`, muted: true });
  }
  if (typeof appointment.patient_age === 'number') {
    meta.push({ icon: ICONS.info, text: `Edad: ${appointment.patient_age} años`, muted: true });
  }
  if (appointment.patient_gender) {
    const genderLabel =
      appointment.patient_gender === 'female'
        ? 'Femenino'
        : appointment.patient_gender === 'male'
        ? 'Masculino'
        : appointment.patient_gender;
    meta.push({ icon: ICONS.user, text: `Género: ${genderLabel}`, muted: true });
  }
  if (appointment.patient_phone) {
    meta.push({ icon: ICONS.phone, text: `Teléfono: ${appointment.patient_phone}`, muted: true });
  } else if (appointment.legacy_phone) {
    meta.push({ icon: ICONS.phone, text: `Teléfono: ${appointment.legacy_phone}`, muted: true });
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
  const visitId = appointment.visit_id ?? appointment.visitId ?? null;
  if (visitId) {
    params.set('visitId', visitId);
  }
  return `/admin/medical-history?${params.toString()}`;
};

const hasCompletedHistory = (appointment) => Boolean(appointment?.medical_history_id);

const createHistoryButton = (appointment) => {
  const historyUrl = buildHistoryUrl(appointment);
  if (!historyUrl) return '';
  const completed = hasCompletedHistory(appointment);
  const buttonClasses = completed
    ? 'admin-button admin-button--success'
    : 'admin-button admin-button--secondary';
  const iconMarkup = `<span class="records-icon" aria-hidden="true">${completed ? ICONS.status : ICONS.clipboard}</span>`;
  const label = completed ? 'Historial completado' : 'Registrar historial';
  return `
    <button
      type="button"
      class="${buttonClasses}"
      data-register-history
      data-history-url="${escapeHtml(historyUrl)}"
    >
      ${iconMarkup}
      ${escapeHtml(label)}
    </button>
  `;
};

const createDetailsLink = (appointment) => {
  const historyUrl = buildHistoryUrl(appointment);
  if (!historyUrl) {
    return '<span class="doctor-note">Sin paciente asignado</span>';
  }
  const completed = hasCompletedHistory(appointment);
  const buttonClasses = completed
    ? 'admin-button admin-button--success admin-button--compact'
    : 'admin-button admin-button--secondary admin-button--compact';
  const icon = completed ? ICONS.status : ICONS.clipboard;
  const label = completed ? 'Historial completado' : 'Completar historial';
  return `
    <button
      type="button"
      class="${buttonClasses}"
      data-doctor-history-link
      data-history-url="${escapeHtml(historyUrl)}"
    >
      <span class="records-icon" aria-hidden="true">${icon}</span>
      ${escapeHtml(label)}
    </button>
  `;
};

const renderLines = (lines = []) =>
  lines
    .filter((line) => line && line.text)
    .map(({ icon, text, muted }) => {
      const iconMarkup = icon
        ? `<span class="records-icon" aria-hidden="true">${icon}</span>`
        : '';
      const lineClass = `records-entry-line${muted ? ' records-entry-line--muted' : ''}`;
      return `<div class="${lineClass}">${iconMarkup}<span>${escapeHtml(text)}</span></div>`;
    })
    .join('');

const renderTable = (target, appointments, emptyMessage, renderAction, rowVariant = 'appointment') => {
  if (!target) return;
  if (!appointments.length) {
    target.innerHTML = `
      <tr class="records-empty">
        <td colspan="5">${escapeHtml(emptyMessage)}</td>
      </tr>
    `;
    return;
  }

  target.innerHTML = appointments
    .map((appointment) => {
      const metaLines = renderLines(buildPatientMeta(appointment));
      const patientName = appointment.patient_name ?? appointment.legacy_name ?? 'Sin asignar';
      const statusClass = appointment.status
        ? `records-status records-status--${appointment.status}`
        : 'records-status';
      const statusLabel = formatStatus(appointment.status);
      const actionMarkup = (renderAction(appointment) || '').trim();
      const reason = appointment.reason ?? '-';
      const additionalNotes =
        appointment.additional_notes ?? appointment.additionalNotes ?? appointment.intake_notes ?? null;
      const additionalMarkup = additionalNotes
        ? renderLines([
            {
              icon: ICONS.note,
              text: additionalNotes,
              muted: true,
            },
          ])
        : '';
      const actionCell = actionMarkup
        ? `<div class="doctor-actions">${actionMarkup}</div>`
        : '<span class="doctor-note">Sin acciones</span>';

      const scheduleLines = renderLines([
        { icon: ICONS.calendar, text: formatDateTime(appointment.scheduled_for) },
      ]);

      const rowModifier = rowVariant === 'history' ? 'records-row--history' : 'records-row--appointment';

      return `
        <tr class="records-row ${rowModifier}">
          <td>
            <div class="records-entry">
              <div class="records-entry-header">
                <span class="records-entry-date">${escapeHtml(patientName)}</span>
              </div>
              ${metaLines}
            </div>
          </td>
          <td>
            <div class="records-entry">
              ${scheduleLines}
            </div>
          </td>
          <td>
            <div class="records-entry">
              <span class="records-pill">
                <span class="records-icon records-icon--pill" aria-hidden="true">${ICONS.note}</span>
                <span>${escapeHtml(reason)}</span>
              </span>
              ${additionalMarkup}
            </div>
          </td>
          <td>
            <div class="records-entry records-entry--status">
              <span class="${statusClass}">
                <span class="records-icon records-icon--status" aria-hidden="true">${ICONS.status}</span>
                ${escapeHtml(statusLabel)}
              </span>
            </div>
          </td>
          <td>
            <div class="records-entry">
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

  document.querySelectorAll('[data-doctor-history-link]').forEach((button) => {
    button.addEventListener('click', () => {
      const url = button.dataset.historyUrl;
      if (!url) {
        createNotification({
          title: 'No se pudo abrir el historial',
          description: 'Intenta nuevamente o recarga la página.',
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
    (appointment) => createHistoryButton(appointment),
    'appointment'
  );

  renderTable(
    historyBody,
    history,
    'Sin registros recientes. Asegúrate de completar el historial clínico después de cada consulta.',
    (appointment) => createDetailsLink(appointment),
    'history'
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

  renderTable(upcomingBody, [], 'Cargando...', () => '', 'appointment');
  renderTable(historyBody, [], 'Cargando...', () => '', 'history');

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

    const message = escapeHtml(error.message ?? 'Error al cargar las citas');
    upcomingBody.innerHTML = `
      <tr class="records-empty records-empty--error">
        <td colspan="5">${message}</td>
      </tr>
    `;
    historyBody.innerHTML = `
      <tr class="records-empty records-empty--error">
        <td colspan="5">${message}</td>
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

existingPatientToggle?.addEventListener('change', handleExistingToggleChange);

if (emailField instanceof HTMLInputElement) {
  emailField.addEventListener('input', () => {
    if (resolvedPatient) {
      clearExistingPatientState({ keepValues: true });
      if (existingPatientToggle instanceof HTMLInputElement) {
        existingPatientToggle.checked = false;
      }
    }
  });
}

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
    patient: (() => {
      const patientIdValue = formData.get('patientId')?.toString().trim() ?? '';
      const parsedPatientId = patientIdValue ? Number(patientIdValue) : NaN;
      const resolvedPatientId = Number.isFinite(parsedPatientId)
        ? parsedPatientId
        : typeof resolvedPatient?.id === 'number'
        ? resolvedPatient.id
        : undefined;

      const documentId = formData.get('documentId')?.toString().trim() ?? '';
      const emailValue = formData.get('email')?.toString().trim() ?? '';
      const phoneValue = formData.get('phone')?.toString().trim() ?? '';

      return {
        id: resolvedPatientId,
        fullName,
        documentId: documentId || resolvedPatient?.documentId || undefined,
        email: emailValue || resolvedPatient?.email || undefined,
        phone: phoneValue || resolvedPatient?.phone || undefined,
        birthDate: resolvedPatient?.birthDate ?? undefined,
        gender: resolvedPatient?.gender ?? undefined,
        age:
          typeof resolvedPatient?.age === 'number' && Number.isFinite(resolvedPatient.age)
            ? resolvedPatient.age
            : undefined,
      };
    })(),
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
    clearExistingPatientState({ keepValues: true });
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
