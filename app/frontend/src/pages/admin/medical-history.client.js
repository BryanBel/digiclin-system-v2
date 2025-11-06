import { BACK_ENDPOINT } from '../../config/endpoint.js';
import { createNotification } from '../../features/notifications/notification.js';

const tableBody = document.querySelector('[data-history-body]');
const modal = document.querySelector('[data-history-modal]');
const panel = document.querySelector('[data-history-panel]');
const panelTitle = document.querySelector('[data-history-panel-title]');
const panelDescription = document.querySelector('[data-history-panel-description]');
const readonlyNotice = document.querySelector('[data-history-readonly]');
const metaPatient = document.querySelector('[data-history-meta-patient]');
const metaDocument = document.querySelector('[data-history-meta-document]');
const metaDoctor = document.querySelector('[data-history-meta-doctor]');
const metaEntry = document.querySelector('[data-history-meta-entry]');
const metaEmail = document.querySelector('[data-history-meta-email]');
const metaPhone = document.querySelector('[data-history-meta-phone]');
const timelineSection = document.querySelector('[data-history-timeline]');
const timelineList = document.querySelector('[data-history-timeline-list]');
const timelineCount = document.querySelector('[data-history-timeline-count]');
const form = document.querySelector('#history-form');
const patientField = document.querySelector('[data-history-patient-field]');
const patientSelect = document.querySelector('[data-history-patient-select]');
const entryDateInput = document.querySelector('[data-history-entry-date]');
const medicalInformInput = document.querySelector('[data-history-medical-inform]');
const treatmentInput = document.querySelector('[data-history-treatment]');
const recipeInput = document.querySelector('[data-history-recipe]');
const feedback = document.querySelector('#history-feedback');
const submitButton = document.querySelector('[data-history-submit]');
const closeTriggers = document.querySelectorAll('[data-close-history-panel]');
const actionsContainer = document.querySelector('[data-history-actions]');
const searchInput = document.querySelector('[data-history-search]');
const createButton = document.querySelector('[data-open-history-create]');

const canEdit = form?.dataset.canEdit === 'true';
const urlParams = new URLSearchParams(window.location.search);

const state = {
  entries: [],
  patients: [],
  activeEntry: null,
  activePatientId: null,
  isCreating: false,
  currentSearch: '',
  debounceTimer: null,
  canEdit,
  pendingPrefill: {
    patientId: urlParams.get('patientId'),
    reason: urlParams.get('reason'),
    scheduledFor: urlParams.get('scheduledFor'),
    visitId: urlParams.get('visitId'),
    used: false,
  },
  formVisitId: null,
};

const formatDateTime = (value) => {
  if (!value) return 'Sin registro';
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

const toInputDateTimeValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMinutes = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offsetMinutes * 60000);
  return local.toISOString().slice(0, 16);
};

const resetFeedback = () => {
  feedback.textContent = '';
  feedback.className = 'admin-feedback';
};

const setFormEditable = (editable) => {
  const controls = [entryDateInput, medicalInformInput, treatmentInput, recipeInput];
  controls.forEach((control) => {
    if (control) control.disabled = !editable;
  });
  if (patientSelect) {
    patientSelect.disabled = !editable;
  }
  if (submitButton) {
    submitButton.hidden = !editable;
    submitButton.disabled = !editable;
  }
  if (actionsContainer) {
    actionsContainer.dataset.mode = editable ? 'edit' : 'view';
  }
};

setFormEditable(state.canEdit);

const renderPatientOptions = () => {
  if (!patientSelect) return;
  const currentValue = patientSelect.value;
  const options = ['<option value="">Selecciona un paciente</option>'];
  state.patients.forEach((patient) => {
    const documentLabel = patient.document_id ? ` - ${patient.document_id}` : '';
    options.push(
      `<option value="${patient.id}">${patient.full_name}${documentLabel}</option>`,
    );
  });
  patientSelect.innerHTML = options.join('');
  if (currentValue) {
    patientSelect.value = currentValue;
  }
};

const getEntryPatientId = (entry) => entry.patientId ?? entry.patient?.id ?? null;

const sortEntriesDesc = (entries) =>
  [...entries].sort((a, b) => {
    const dateA = a.entryDate ? new Date(a.entryDate).getTime() : 0;
    const dateB = b.entryDate ? new Date(b.entryDate).getTime() : 0;
    return dateB - dateA;
  });

const buildPatientSummaries = () => {
  const summaries = new Map();

  state.entries.forEach((entry) => {
    const patientId = getEntryPatientId(entry);
    if (!patientId) return;

    const existing = summaries.get(patientId);
    if (!existing) {
      summaries.set(patientId, {
        patientId,
        patient: entry.patient ?? null,
        latestEntry: entry,
        totalEntries: 1,
      });
      return;
    }

    existing.totalEntries += 1;
    const existingDate = existing.latestEntry?.entryDate ? new Date(existing.latestEntry.entryDate) : null;
    const currentDate = entry.entryDate ? new Date(entry.entryDate) : null;
    if (!existingDate || (currentDate && currentDate > existingDate)) {
      existing.latestEntry = entry;
    }
  });

  return Array.from(summaries.values()).sort((a, b) => {
    const dateA = a.latestEntry?.entryDate ? new Date(a.latestEntry.entryDate).getTime() : 0;
    const dateB = b.latestEntry?.entryDate ? new Date(b.latestEntry.entryDate).getTime() : 0;
    return dateB - dateA;
  });
};

const renderTable = () => {
  const summaries = buildPatientSummaries();

  if (!summaries.length) {
    tableBody.innerHTML = `
      <tr class="admin-empty">
        <td colspan="6">No se encontraron registros.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = summaries
    .map((summary) => {
      const { latestEntry, patient, totalEntries } = summary;
      const patientName = patient?.name ?? 'Sin nombre';
      const patientDocument = patient?.documentId ? `Documento: ${patient.documentId}` : '';
      const patientEmail = patient?.email ?? '';
      const patientPhone = patient?.phone ?? '';
      const doctorLabel = latestEntry?.doctor?.name ?? 'Sin doctor asignado';
      const patientId = summary.patientId;

      return `
        <tr class="admin-history-row" data-history-patient="${patientId}">
          <td>
            <div class="admin-cell admin-cell--person">
              <div class="admin-history-summary">
                <strong>${patientName}</strong>
                <div class="admin-history-meta">
                  ${patientDocument ? `<span>${patientDocument}</span>` : ''}
                  ${patientEmail ? `<span>${patientEmail}</span>` : ''}
                  ${patientPhone ? `<span>${patientPhone}</span>` : ''}
                </div>
              </div>
              <div class="admin-row-hint">VER HISTORIAL (${totalEntries})</div>
            </div>
          </td>
          <td><div class="admin-cell">${formatDateTime(latestEntry?.entryDate)}</div></td>
          <td><div class="admin-cell"><p class="admin-history-text">${latestEntry?.medicalInform ?? 'Sin registro'}</p></div></td>
          <td><div class="admin-cell"><p class="admin-history-text">${latestEntry?.treatment ?? 'Sin registro'}</p></div></td>
          <td><div class="admin-cell"><p class="admin-history-text">${latestEntry?.recipe ?? 'Sin registro'}</p></div></td>
          <td><div class="admin-cell">${doctorLabel}</div></td>
        </tr>
      `;
    })
    .join('');
};

const attachRowListeners = () => {
  tableBody.querySelectorAll('[data-history-patient]').forEach((row) => {
    row.addEventListener('click', () => openPatientHistory(Number(row.dataset.historyPatient)));
  });
};

const loadPatientOptions = async () => {
  try {
  const response = await fetch(`${BACK_ENDPOINT}/api/patients?limit=100`, {
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error ?? 'No se pudieron obtener los pacientes.');
    }
    state.patients = Array.isArray(data.patients) ? data.patients : [];
    renderPatientOptions();
  } catch (error) {
    console.error('Error cargando pacientes:', error);
    createNotification({
      title: 'Sin pacientes',
      description: error.message,
      type: 'error',
    });
  }
};

const loadEntries = async () => {
  tableBody.innerHTML = `
    <tr class="admin-empty">
      <td colspan="6">Cargando historial clínico...</td>
    </tr>
  `;

  try {
    const collectedEntries = [];
    const limit = 100;
    const maxBatches = 20; // evita solicitudes infinitas si existieran más de 2000 registros
    const trimmedSearch = state.currentSearch.trim();

    let offset = 0;
    let batchCount = 0;

    while (true) {
      const params = new URLSearchParams();
      if (trimmedSearch) {
        params.set('search', trimmedSearch);
      }
      params.set('limit', String(limit));
      if (offset) {
        params.set('offset', String(offset));
      }

      const query = params.toString();
      const url = query
        ? `${BACK_ENDPOINT}/api/medical-history?${query}`
        : `${BACK_ENDPOINT}/api/medical-history`;

      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? 'No se pudo cargar el historial.');
      }

      const chunk = Array.isArray(data.entries) ? data.entries : [];
      collectedEntries.push(...chunk);

      batchCount += 1;
      if (chunk.length < limit || batchCount >= maxBatches) {
        break;
      }

      offset += limit;
    }

    state.entries = collectedEntries;
    renderTable();
    attachRowListeners();
    refreshActiveTimeline();
  } catch (error) {
    console.error('Error cargando historiales:', error);
    tableBody.innerHTML = `
      <tr class="admin-empty">
        <td colspan="6">${error.message}</td>
      </tr>
    `;
  }
};

const closePanel = () => {
  state.activeEntry = null;
  state.activePatientId = null;
  state.isCreating = false;
  state.formVisitId = null;
  if (panel) {
    panel.hidden = true;
    panel.removeAttribute('data-mode');
  }
  resetFeedback();
  form.reset();
  populateMeta(null);
  if (timelineSection) {
    timelineSection.hidden = true;
  }
  if (timelineList) {
    timelineList.innerHTML = '';
  }
  if (timelineCount) {
    timelineCount.textContent = '-';
  }
  if (patientField) {
    patientField.hidden = true;
    patientSelect.required = false;
  }
  if (readonlyNotice) {
    readonlyNotice.hidden = true;
  }
  if (form) {
    form.hidden = false;
  }
  panelDescription.textContent =
    'Selecciona un registro para consultarlo o registra nuevos antecedentes desde el listado.';
  if (modal) {
    modal.hidden = true;
  }
  document.body.style.removeProperty('overflow');
  setFormEditable(false);
};

const populateMeta = (entry) => {
  metaPatient.textContent = entry?.patient?.name ?? 'Sin registro';
  metaDocument.textContent = entry?.patient?.documentId ?? 'Sin documento';
  metaDoctor.textContent = entry?.doctor?.name ?? 'Sin asignar';
  metaEntry.textContent = formatDateTime(entry?.entryDate);
  metaEmail.textContent = entry?.patient?.email ?? 'Sin correo';
  metaPhone.textContent = entry?.patient?.phone ?? 'Sin teléfono';
};

const renderTimeline = (entries) => {
  if (!timelineSection || !timelineList) return;
  const sorted = sortEntriesDesc(entries);

  timelineList.innerHTML = sorted
    .map((entry) => {
      const doctorLabel = entry.doctor?.name ?? 'Sin doctor asignado';
      const treatment = entry.treatment ?? 'Sin tratamiento registrado';
      const recipe = entry.recipe ?? 'Sin receta registrada';

      return `
        <li class="history-timeline__item">
          <div class="history-timeline__item-header">
            <strong>${formatDateTime(entry.entryDate)}</strong>
            <span>Doctor: ${doctorLabel}</span>
          </div>
          <div class="history-timeline__item-body">
            <span><strong>Motivo:</strong> ${entry.medicalInform ?? 'Sin registro'}</span>
            <span><strong>Tratamiento:</strong> ${treatment}</span>
            <span><strong>Receta:</strong> ${recipe}</span>
          </div>
        </li>
      `;
    })
    .join('');

  timelineSection.hidden = false;
  if (timelineCount) {
    const total = sorted.length;
    timelineCount.textContent = `${total} registro${total === 1 ? '' : 's'}`;
  }
};

const openPatientHistory = (patientId) => {
  if (!patientId) return;

  const entries = state.entries.filter((item) => getEntryPatientId(item) === patientId);
  if (!entries.length) return;

  const sortedEntries = sortEntriesDesc(entries);

  const latestEntry = sortedEntries[0];

  state.activeEntry = null;
  state.activePatientId = patientId;
  state.isCreating = false;
  state.formVisitId = null;

  if (patientField) {
    patientField.hidden = true;
    patientSelect.required = false;
  }

  if (form) {
    form.hidden = true;
  }

  if (panel) {
    panel.hidden = false;
    panel.dataset.mode = 'view';
  }
  const patientName = latestEntry.patient?.name ?? 'Paciente sin nombre';
  panelTitle.textContent = `Historial clínico de ${patientName}`;
  panelDescription.textContent =
    'Consulta la evolución clínica del paciente. Registra un nuevo antecedente para añadir más información.';
  if (readonlyNotice) {
    readonlyNotice.hidden = false;
  }
  populateMeta(latestEntry);

  renderTimeline(sortedEntries);

  resetFeedback();
  if (modal) {
    modal.hidden = false;
  }
  document.body.style.setProperty('overflow', 'hidden');
  panel?.focus({ preventScroll: true });
  panel?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  setFormEditable(false);
};

const refreshActiveTimeline = () => {
  if (!state.activePatientId) return;
  if (!panel || panel.hidden) return;

  const entries = state.entries.filter((item) => getEntryPatientId(item) === state.activePatientId);
  if (!entries.length) {
    closePanel();
    return;
  }

  const sortedEntries = sortEntriesDesc(entries);
  const latestEntry = sortedEntries[0];
  populateMeta(latestEntry);
  const patientName = latestEntry.patient?.name ?? 'Paciente sin nombre';
  panelTitle.textContent = `Historial clínico de ${patientName}`;
  renderTimeline(sortedEntries);
};

const openCreatePanel = async () => {
  if (!state.canEdit) return;

  state.activeEntry = null;
  state.activePatientId = null;
  state.isCreating = true;
  state.formVisitId = null;

  if (!state.patients.length) {
    await loadPatientOptions();
  } else {
    renderPatientOptions();
  }

  if (patientField) {
    patientField.hidden = false;
    patientSelect.required = true;
    patientSelect.value = '';
  }

  form.reset();
  populateMeta(null);

  if (panel) {
    panel.hidden = false;
    panel.dataset.mode = 'create';
  }
  panelTitle.textContent = 'Nuevo historial médico';
  panelDescription.textContent = 'Registra un nuevo antecedente clínico para el paciente seleccionado.';
  if (readonlyNotice) {
    readonlyNotice.hidden = true;
  }
  if (timelineSection) {
    timelineSection.hidden = true;
  }
  if (timelineList) {
    timelineList.innerHTML = '';
  }
  if (timelineCount) {
    timelineCount.textContent = '-';
  }
  if (form) {
    form.hidden = false;
  }
  resetFeedback();
  if (modal) {
    modal.hidden = false;
  }
  document.body.style.setProperty('overflow', 'hidden');
  panel?.focus({ preventScroll: true });
  panel?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  setFormEditable(true);
  if (submitButton) {
    submitButton.textContent = 'Registrar historial';
  }
};

const handleFormSubmit = async (event) => {
  event.preventDefault();

  if (!state.canEdit) {
    closePanel();
    return;
  }

  if (!state.isCreating) {
    feedback.textContent =
      'Este registro es de solo lectura. Usa “Registrar historial” para añadir nueva información.';
    feedback.className = 'admin-feedback admin-feedback--error';
    return;
  }

  resetFeedback();
  submitButton.disabled = true;
  submitButton.textContent = 'Registrando...';

  try {
    const medicalInform = medicalInformInput.value.trim();
    const treatment = treatmentInput.value.trim();
    const recipe = recipeInput.value.trim();
    const entryDateValue = entryDateInput.value ? new Date(entryDateInput.value) : null;
    const entryDate = entryDateValue ? entryDateValue.toISOString() : undefined;

    if (!medicalInform) {
      throw new Error('Describe el motivo o diagnóstico antes de guardar.');
    }

    const selectedPatientId = patientSelect.value;
    if (!selectedPatientId) {
      throw new Error('Selecciona un paciente para registrar el historial.');
    }

    const response = await fetch(`${BACK_ENDPOINT}/api/medical-history`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: Number(selectedPatientId),
        entryDate,
        medicalInform,
        treatment: treatment || undefined,
        recipe: recipe || undefined,
        visitId: state.formVisitId ?? undefined,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error ?? 'No se pudo registrar el historial.');
    }

    createNotification({
      title: 'Historial creado',
      description: 'El registro clínico fue añadido correctamente.',
      type: 'success',
    });

    feedback.textContent = 'Cambios guardados correctamente.';
    feedback.className = 'admin-feedback admin-feedback--success';
  const numericPatientId = Number(selectedPatientId);
  await loadEntries();
  closePanel();
  openPatientHistory(numericPatientId);
  } catch (error) {
    feedback.textContent = error.message;
    feedback.className = 'admin-feedback admin-feedback--error';
    createNotification({
      title: 'No se pudo guardar',
      description: error.message,
      type: 'error',
    });
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Registrar historial';
  }
};

const attemptPrefill = async () => {
  if (!state.canEdit || !state.pendingPrefill || state.pendingPrefill.used) return;
  const { patientId, reason, scheduledFor, visitId } = state.pendingPrefill;
  if (!patientId) return;

  await openCreatePanel();

  if (patientSelect) {
    patientSelect.value = patientId;
  }

  if (scheduledFor) {
    const date = new Date(scheduledFor);
    if (!Number.isNaN(date.getTime())) {
      entryDateInput.value = toInputDateTimeValue(date.toISOString());
    }
  }

  if (reason) {
    medicalInformInput.value = reason;
  }

  if (visitId) {
    const parsedId = Number(visitId);
    state.formVisitId = Number.isNaN(parsedId) ? null : parsedId;
  }

  state.pendingPrefill.used = true;

  if (window.location.search) {
    const nextUrl = new URL(window.location.href);
    nextUrl.search = '';
    window.history.replaceState({}, '', nextUrl.toString());
  }
};

const handleSearchInput = (event) => {
  const value = event.target.value;
  state.currentSearch = value;

  if (state.debounceTimer) {
    clearTimeout(state.debounceTimer);
  }

  state.debounceTimer = setTimeout(() => {
    loadEntries();
  }, 300);
};

createButton?.addEventListener('click', openCreatePanel);
form?.addEventListener('submit', handleFormSubmit);
closeTriggers.forEach((trigger) => {
  trigger.addEventListener('click', closePanel);
});
searchInput?.addEventListener('input', handleSearchInput);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal && !modal.hidden) {
    closePanel();
  }
});

(async () => {
  await loadEntries();
  await attemptPrefill();
})();