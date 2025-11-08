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
const attachmentsField = document.querySelector('[data-history-attachments-field]');
const attachmentsInput = document.querySelector('[data-history-attachments-input]');
const attachmentsPreviewList = document.querySelector('[data-history-attachments-preview]');
const attachmentsMeta = document.querySelector('[data-history-attachments-meta]');
const attachmentsCountLabel = document.querySelector('[data-history-attachments-count]');
const attachmentsOpenButton = document.querySelector('[data-open-history-attachments]');
const attachmentsOverlay = document.querySelector('[data-history-attachments-overlay]');
const attachmentsOverlayCount = document.querySelector('[data-history-attachments-overlay-count]');
const attachmentsOverlayList = document.querySelector('[data-history-attachments-items]');
const attachmentsOverlayPreviewCanvas = document.querySelector('[data-history-attachments-preview-canvas]');
const attachmentsOverlayPreviewEmpty = document.querySelector('[data-history-attachments-preview-empty]');
const attachmentsOverlayPreviewActions = document.querySelector('[data-history-attachments-preview-actions]');
const attachmentsOverlayOpenLink = document.querySelector('[data-history-attachments-preview-open]');
const attachmentsOverlayDownloadLink = document.querySelector('[data-history-attachments-preview-download]');
const attachmentsOverlayCloseButtons = document.querySelectorAll('[data-close-history-attachments]');

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
  selectedAttachments: [],
  overlayAttachments: [],
  overlayAttachmentIndex: null,
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

const escapeHtml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const toInputDateTimeValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMinutes = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offsetMinutes * 60000);
  return local.toISOString().slice(0, 16);
};

const allowedAttachmentTypes = new Set(['application/pdf', 'image/png', 'image/jpeg']);
const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Tamaño desconocido';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex === 0 ? 0 : size < 10 ? 1 : 0;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
};

const buildFileUrl = (relativePath) => {
  if (!relativePath || typeof relativePath !== 'string') return '';
  if (/^https?:/i.test(relativePath)) return relativePath;
  const normalized = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${BACK_ENDPOINT}${normalized}`;
};

const buildAttachmentKey = (entry, attachment, fallbackIndex) => {
  if (attachment && attachment.id !== undefined && attachment.id !== null) {
    return `id:${attachment.id}`;
  }
  const entryId = entry?.id ?? 'unknown';
  const identifier =
    attachment?.filepath ??
    attachment?.url ??
    attachment?.name ??
    `attachment-${entryId}-${fallbackIndex}`;
  return `entry:${entryId}|${identifier}`;
};

const resetSelectedAttachments = () => {
  state.selectedAttachments = [];
  if (attachmentsInput) {
    attachmentsInput.value = '';
  }
  if (attachmentsPreviewList) {
    attachmentsPreviewList.innerHTML = '';
  }
};

const renderAttachmentsPreview = () => {
  if (!attachmentsPreviewList) return;
  if (!state.selectedAttachments.length) {
    attachmentsPreviewList.innerHTML = '';
    return;
  }

  const items = state.selectedAttachments
    .map((file, index) => {
      const sizeLabel = formatFileSize(file.size);
      const label = `${file.name}`;
      return `
        <li class="attachments-preview__item" data-preview-index="${index}">
          <div class="attachments-preview__meta">
            <span class="attachments-preview__name">${escapeHtml(label)}</span>
            <span class="attachments-preview__info">${escapeHtml(file.type || 'Tipo desconocido')} · ${escapeHtml(sizeLabel)}</span>
          </div>
        </li>
      `;
    })
    .join('');

  attachmentsPreviewList.innerHTML = items;
};

const handleAttachmentsInputChange = (event) => {
  const files = event.target?.files ? Array.from(event.target.files) : [];
  if (!files.length) {
    resetSelectedAttachments();
    return;
  }

  if (files.length > MAX_ATTACHMENTS) {
    createNotification({
      title: 'Demasiados archivos',
      description: `Solo puedes adjuntar hasta ${MAX_ATTACHMENTS} archivos por registro.`,
      type: 'error',
    });
    resetSelectedAttachments();
    return;
  }

  const invalidFile = files.find((file) => {
    if (!allowedAttachmentTypes.has(file.type)) return true;
    if (file.size > MAX_ATTACHMENT_SIZE) return true;
    return false;
  });

  if (invalidFile) {
    createNotification({
      title: 'Archivo no permitido',
      description: 'Adjunta únicamente PDF, PNG o JPG de hasta 10MB.',
      type: 'error',
    });
    resetSelectedAttachments();
    return;
  }

  state.selectedAttachments = files;
  renderAttachmentsPreview();
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

const findPatientById = (candidateId) => {
  if (!candidateId) return null;
  const numericId = Number(candidateId);
  if (Number.isNaN(numericId)) return null;
  return state.patients.find((patient) => Number(patient.id) === numericId) ?? null;
};

const updateMetaFromForm = () => {
  const selectedId = patientSelect?.value;
  if (!selectedId) {
    populateMeta(null);
    return;
  }

  const patient = findPatientById(selectedId);
  if (!patient) {
    populateMeta(null);
    return;
  }

  const entryDateValue = entryDateInput?.value || null;

  populateMeta({
    patient: {
      name: patient.full_name ?? 'Sin registro',
      documentId: patient.document_id ?? 'Sin documento',
      email: patient.email ?? 'Sin correo',
      phone: patient.phone ?? 'Sin teléfono',
    },
    entryDate: entryDateValue,
  });
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

const getEntriesForPatient = (patientId) => {
  if (!patientId) return [];
  return state.entries.filter((item) => getEntryPatientId(item) === patientId);
};

const countAttachmentsForPatient = (patientId) => {
  return getEntriesForPatient(patientId).reduce((total, entry) => {
    const attachments = Array.isArray(entry.attachments) ? entry.attachments : [];
    return total + attachments.length;
  }, 0);
};

const updateAttachmentsMetaForPatient = (patientId) => {
  if (!attachmentsMeta || !attachmentsCountLabel || !attachmentsOpenButton) return;

  if (!patientId) {
    attachmentsMeta.hidden = true;
    attachmentsCountLabel.textContent = 'Sin archivos adjuntos';
    attachmentsOpenButton.disabled = true;
    return;
  }

  const total = countAttachmentsForPatient(patientId);
  attachmentsMeta.hidden = false;
  attachmentsCountLabel.textContent = total
    ? `${total} archivo${total === 1 ? '' : 's'} adjunto${total === 1 ? '' : 's'}`
    : 'Sin archivos adjuntos';
  attachmentsOpenButton.disabled = total === 0;
};

const resetAttachmentsOverlay = () => {
  state.overlayAttachments = [];
  state.overlayAttachmentIndex = null;
  if (attachmentsOverlayList) attachmentsOverlayList.innerHTML = '';
  if (attachmentsOverlayPreviewCanvas) attachmentsOverlayPreviewCanvas.innerHTML = '';
  if (attachmentsOverlayPreviewEmpty) attachmentsOverlayPreviewEmpty.hidden = false;
  if (attachmentsOverlayPreviewActions) attachmentsOverlayPreviewActions.hidden = true;
  if (attachmentsOverlayCount) attachmentsOverlayCount.textContent = '0 archivos';
  attachmentsOverlay?.removeAttribute('data-mode');
};

const closeAttachmentsOverlay = () => {
  if (attachmentsOverlay) {
    attachmentsOverlay.hidden = true;
  }
  resetAttachmentsOverlay();
};

const selectOverlayAttachment = (index) => {
  if (!Array.isArray(state.overlayAttachments) || !state.overlayAttachments.length) return;
  if (index < 0 || index >= state.overlayAttachments.length) return;

  state.overlayAttachmentIndex = index;

  const item = state.overlayAttachments[index];
  if (!item || !attachmentsOverlayPreviewCanvas || !attachmentsOverlayPreviewEmpty) return;

  attachmentsOverlayPreviewCanvas.innerHTML = '';
  attachmentsOverlayPreviewEmpty.hidden = true;

  const { attachment, entry } = item;
  const fileUrl = buildFileUrl(attachment?.url ?? attachment?.filepath ?? '');

  if (!fileUrl) {
    attachmentsOverlayPreviewCanvas.innerHTML = '<p>No se pudo cargar la vista previa.</p>';
  } else if (attachment?.mimetype?.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = fileUrl;
    img.alt = attachment?.name ?? 'Imagen adjunta';
    attachmentsOverlayPreviewCanvas.appendChild(img);
  } else if (attachment?.mimetype === 'application/pdf') {
    const iframe = document.createElement('iframe');
    iframe.src = `${fileUrl}#toolbar=0&navpanes=0`;
    iframe.title = attachment?.name ?? 'Documento PDF';
    attachmentsOverlayPreviewCanvas.appendChild(iframe);
  } else {
    attachmentsOverlayPreviewCanvas.innerHTML = `
      <div class="history-attachments-overlay__placeholder">
        <p>No se puede previsualizar este tipo de archivo.</p>
        <p>Descárgalo para revisarlo localmente.</p>
      </div>
    `;
  }

  if (attachmentsOverlayPreviewActions) {
    attachmentsOverlayPreviewActions.hidden = !fileUrl;
  }

  if (attachmentsOverlayOpenLink) {
    attachmentsOverlayOpenLink.href = fileUrl || '#';
  }

  if (attachmentsOverlayDownloadLink) {
    attachmentsOverlayDownloadLink.href = fileUrl || '#';
    attachmentsOverlayDownloadLink.download = attachment?.filename ?? attachment?.name ?? 'adjunto';
  }

  if (attachmentsOverlayList) {
    attachmentsOverlayList.querySelectorAll('[data-history-attachment-index]').forEach((button) => {
      if (Number(button.dataset.historyAttachmentIndex) === index) {
        button.classList.add('history-attachments-overlay__item-button--active');
      } else {
        button.classList.remove('history-attachments-overlay__item-button--active');
      }
    });
  }

  if (attachmentsOverlayPreviewCanvas && entry) {
    const contextInfo = document.createElement('p');
    contextInfo.className = 'history-attachments-overlay__placeholder';
    const doctorLabel = entry.doctor?.name ? ` · Doctor: ${entry.doctor.name}` : '';
    contextInfo.textContent = `Registro del ${formatDateTime(entry.entryDate)}${doctorLabel}`;
    attachmentsOverlayPreviewCanvas.appendChild(contextInfo);
  }
};

const buildOverlayItemsForPatient = (patientId) => {
  if (!patientId) return [];

  const entries = sortEntriesDesc(getEntriesForPatient(patientId));
  const flattened = [];

  entries.forEach((entry) => {
    const attachments = Array.isArray(entry.attachments) ? entry.attachments : [];
    attachments.forEach((attachment, index) => {
      const key = buildAttachmentKey(entry, attachment, `${flattened.length}-${index}`);
      flattened.push({
        entry,
        attachment,
        key,
      });
    });
  });

  return flattened;
};

const openAttachmentsOverlay = ({ patientId, entryId, attachmentIndex, onlyEntry = false } = {}) => {
  const targetPatientId = patientId ?? state.activePatientId;
  if (!targetPatientId) {
    createNotification({
      title: 'Sin paciente',
      description: 'Selecciona un paciente antes de consultar archivos adjuntos.',
      type: 'error',
    });
    return;
  }

  const overlayItemsAll = buildOverlayItemsForPatient(targetPatientId);
  const entryKey = entryId === undefined || entryId === null ? null : String(entryId);
  const overlayItems = onlyEntry && entryKey
    ? overlayItemsAll.filter((item) => String(item.entry?.id ?? '') === entryKey)
    : overlayItemsAll;

  if (!overlayItems.length) {
    createNotification({
      title: onlyEntry ? 'Sin archivos en este registro' : 'Sin adjuntos',
      description: onlyEntry
        ? 'Este registro no tiene archivos adjuntos disponibles.'
        : 'Aún no se han adjuntado archivos para este paciente.',
      type: 'info',
    });
    return;
  }

  state.overlayAttachments = overlayItems;
  state.overlayAttachmentIndex = null;

  if (attachmentsOverlayCount) {
    const baseLabel = `${overlayItems.length} archivo${overlayItems.length === 1 ? '' : 's'}`;
    attachmentsOverlayCount.textContent = onlyEntry ? `${baseLabel} del registro` : baseLabel;
  }

  if (attachmentsOverlayList) {
    attachmentsOverlayList.innerHTML = overlayItems
      .map((item, index) => {
        const attachment = item.attachment;
        const entry = item.entry;
        const sizeLabel = attachment?.size ? formatFileSize(attachment.size) : 'Tamaño desconocido';
        const metaParts = [formatDateTime(entry.entryDate)];
        if (attachment?.mimetype) metaParts.push(attachment.mimetype);
        metaParts.push(sizeLabel);
        return `
          <li>
            <button type="button" class="history-attachments-overlay__item-button" data-history-attachment-index="${index}">
              <span class="history-attachments-overlay__item-content">
                <span class="history-attachments-overlay__item-title">${escapeHtml(
                  attachment?.name ?? attachment?.filename ?? 'Archivo adjunto',
                )}</span>
                <span class="history-attachments-overlay__item-meta">${escapeHtml(
                  metaParts.join(' · '),
                )}</span>
              </span>
            </button>
          </li>
        `;
      })
      .join('');
  }

  if (attachmentsOverlay) {
    attachmentsOverlay.hidden = false;
    if (onlyEntry) {
      attachmentsOverlay.setAttribute('data-mode', 'entry');
    } else {
      attachmentsOverlay.removeAttribute('data-mode');
    }
  }

  if (attachmentsOverlayPreviewCanvas) {
    attachmentsOverlayPreviewCanvas.innerHTML = '';
  }
  if (attachmentsOverlayPreviewEmpty) {
    attachmentsOverlayPreviewEmpty.hidden = false;
  }
  if (attachmentsOverlayPreviewActions) {
    attachmentsOverlayPreviewActions.hidden = true;
  }

  attachmentsOverlayList?.querySelectorAll('[data-history-attachment-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.historyAttachmentIndex);
      selectOverlayAttachment(index);
    });
  });

  let initialIndex = 0;
  if (
    typeof attachmentIndex === 'number' &&
    attachmentIndex >= 0 &&
    attachmentIndex < overlayItems.length
  ) {
    initialIndex = attachmentIndex;
  } else if (entryKey) {
    initialIndex = overlayItems.findIndex((item) => String(item.entry?.id ?? '') === entryKey);
    if (initialIndex < 0) initialIndex = 0;
  }

  selectOverlayAttachment(initialIndex);
};

const renderTable = () => {
  const summaries = buildPatientSummaries();

  if (!summaries.length) {
    tableBody.innerHTML = `
      <tr class="records-empty">
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
        <tr class="records-row records-row--history" data-history-patient="${patientId}">
          <td>
            <div class="records-entry">
              <div class="records-entry-header">
                <span class="records-entry-title">${escapeHtml(patientName)}</span>
                <span class="records-badge records-badge--history">${totalEntries} registro${totalEntries === 1 ? '' : 's'}</span>
              </div>
              ${patientDocument ? `<span class="records-entry-line records-entry-line--muted">${escapeHtml(patientDocument)}</span>` : ''}
              ${patientEmail ? `<span class="records-entry-line records-entry-line--muted">${escapeHtml(patientEmail)}</span>` : ''}
              ${patientPhone ? `<span class="records-entry-line records-entry-line--muted">${escapeHtml(patientPhone)}</span>` : ''}
              <span class="admin-row-hint">Ver historial completo</span>
            </div>
          </td>
          <td>
            <div class="records-entry">
              <span class="records-entry-line">${escapeHtml(formatDateTime(latestEntry?.entryDate))}</span>
            </div>
          </td>
          <td>
            <div class="records-entry">
              <p class="admin-history-text">${escapeHtml(latestEntry?.medicalInform ?? 'Sin registro')}</p>
            </div>
          </td>
          <td>
            <div class="records-entry">
              <p class="admin-history-text">${escapeHtml(latestEntry?.treatment ?? 'Sin registro')}</p>
            </div>
          </td>
          <td>
            <div class="records-entry">
              <p class="admin-history-text">${escapeHtml(latestEntry?.recipe ?? 'Sin registro')}</p>
            </div>
          </td>
          <td>
            <div class="records-entry">
              <span class="records-entry-line">${escapeHtml(doctorLabel)}</span>
            </div>
          </td>
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
    <tr class="records-empty">
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

    state.entries = collectedEntries.map((entry) => ({
      ...entry,
      attachments: Array.isArray(entry.attachments) ? entry.attachments : [],
    }));
    renderTable();
    attachRowListeners();
    refreshActiveTimeline();
  } catch (error) {
    console.error('Error cargando historiales:', error);
    tableBody.innerHTML = `
      <tr class="records-empty records-empty--error">
        <td colspan="6">${escapeHtml(error.message)}</td>
      </tr>
    `;
  }
};

const closePanel = () => {
  state.activeEntry = null;
  state.activePatientId = null;
  state.isCreating = false;
  state.formVisitId = null;
  closeAttachmentsOverlay();
  resetSelectedAttachments();
  if (attachmentsMeta) {
    attachmentsMeta.hidden = true;
  }
  if (attachmentsCountLabel) {
    attachmentsCountLabel.textContent = 'Sin archivos adjuntos';
  }
  if (attachmentsOpenButton) {
    attachmentsOpenButton.disabled = true;
  }
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

const renderTimeline = (entries, patientId = state.activePatientId) => {
  if (!timelineSection || !timelineList) return;
  const sorted = sortEntriesDesc(entries);
  const overlayIndexMap = new Map();

  if (patientId) {
    const overlayItems = buildOverlayItemsForPatient(patientId);
    overlayItems.forEach((item, index) => {
      if (!item) return;
      overlayIndexMap.set(item.key, index);
    });
  }

  timelineList.innerHTML = sorted
    .map((entry) => {
      const doctorLabel = entry.doctor?.name ?? 'Sin doctor asignado';
      const treatment = entry.treatment ?? 'Sin tratamiento registrado';
      const recipe = entry.recipe ?? 'Sin receta registrada';
      const attachments = Array.isArray(entry.attachments) ? entry.attachments : [];
      const attachmentsCount = attachments.length;
      const summaryLabel = attachmentsCount
        ? `${attachmentsCount} archivo${attachmentsCount === 1 ? '' : 's'} adjunto${attachmentsCount === 1 ? '' : 's'}`
        : '';
      const attachmentsBadge = attachmentsCount
        ? `<span class="records-badge records-badge--attachments">${escapeHtml(summaryLabel)}</span>`
        : '';

      const attachmentsMarkup = attachmentsCount
        ? (() => {
            const itemsMarkup = attachments
              .map((attachment, attachmentIndex) => {
                const key = buildAttachmentKey(
                  entry,
                  attachment,
                  `${entry.id ?? 'entry'}-${attachmentIndex}`,
                );
                const overlayIndex = overlayIndexMap.has(key)
                  ? overlayIndexMap.get(key)
                  : undefined;
                const mimetypeLabel = attachment?.mimetype ?? 'Formato desconocido';
                const fileType = mimetypeLabel.includes('/')
                  ? mimetypeLabel.split('/').pop()?.toUpperCase()
                  : mimetypeLabel.toUpperCase();
                const sizeLabel = attachment?.size
                  ? formatFileSize(attachment.size)
                  : 'Tamaño desconocido';
                const entryDatasetId = entry?.id !== undefined && entry?.id !== null ? String(entry.id) : '';

                const typeBadge = fileType
                  ? `<span class="history-timeline__attachment-badge">${escapeHtml(fileType)}</span>`
                  : '';

                const entryFilesButton = entryDatasetId
                  ? `
                  <button
                    type="button"
                    class="history-timeline__attachment-action history-timeline__attachment-action--primary"
                    data-history-entry-attachments-overlay-entry="${entryDatasetId}"
                  >
                    Ver archivo(s)
                  </button>
                `
                  : '';

                const viewButton = `
                  <button
                    type="button"
                    class="history-timeline__attachment-action"
                    data-history-entry-attachment-overlay-index="${
                      typeof overlayIndex === 'number' ? overlayIndex : ''
                    }"
                    data-history-entry-attachment-entry="${entryDatasetId}"
                  >
                    Ver en visor
                  </button>
                `;

                return `
                  <li class="history-timeline__attachment-item">
                    <div class="history-timeline__attachment-chip">
                      ${typeBadge}
                      <span class="history-timeline__attachment-name">${escapeHtml(
                        attachment?.name ?? attachment?.filename ?? 'Archivo adjunto',
                      )}</span>
                      <div class="history-timeline__attachment-actions">
                        ${entryFilesButton}
                        ${viewButton}
                      </div>
                    </div>
                  </li>
                `;
              })
              .join('');

            return `
              <div class="history-timeline__attachments">
                <ul class="history-timeline__attachments-list">
                  ${itemsMarkup}
                </ul>
              </div>
            `;
          })()
        : `
            <div class="history-timeline__attachments">
              <span class="history-timeline__attachments-empty">Sin archivos adjuntos</span>
            </div>
          `;

      return `
        <li class="history-timeline__item">
          <div class="history-timeline__grid">
            <div class="history-timeline__cell history-timeline__cell--meta">
              <div class="records-entry history-timeline__entry">
                <div class="records-entry-header">
                  <span class="records-entry-title">${escapeHtml(formatDateTime(entry.entryDate))}</span>
                  ${attachmentsBadge}
                </div>
                <span class="records-entry-line records-entry-line--muted">Doctor: ${escapeHtml(doctorLabel)}</span>
              </div>
            </div>
            <div class="history-timeline__cell history-timeline__cell--details">
              <dl class="history-timeline__details">
                <div class="history-timeline__detail">
                  <dt>Motivo</dt>
                  <dd>${escapeHtml(entry.medicalInform ?? 'Sin registro')}</dd>
                </div>
                <div class="history-timeline__detail">
                  <dt>Tratamiento</dt>
                  <dd>${escapeHtml(treatment)}</dd>
                </div>
                <div class="history-timeline__detail">
                  <dt>Receta</dt>
                  <dd>${escapeHtml(recipe)}</dd>
                </div>
              </dl>
            </div>
            <div class="history-timeline__cell history-timeline__cell--attachments">
              ${attachmentsMarkup}
            </div>
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

  timelineList
    .querySelectorAll('[data-history-entry-attachment-overlay-index]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        const entryKey = button.dataset.historyEntryAttachmentEntry;
        const overlayIndexRaw = button.dataset.historyEntryAttachmentOverlayIndex;
        const overlayIndex = overlayIndexRaw === '' ? NaN : Number(overlayIndexRaw);
        if (Number.isFinite(overlayIndex)) {
          openAttachmentsOverlay({
            patientId: state.activePatientId,
            attachmentIndex: overlayIndex,
          });
        } else if (entryKey) {
          const numericId = Number(entryKey);
          openAttachmentsOverlay({
            patientId: state.activePatientId,
            entryId: Number.isFinite(numericId) ? numericId : entryKey,
          });
        }
      });
    });

  timelineList
    .querySelectorAll('[data-history-entry-attachments-overlay-entry]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        const entryKey = button.dataset.historyEntryAttachmentsOverlayEntry;
        if (!entryKey) return;
        const numericId = Number(entryKey);
        openAttachmentsOverlay({
          patientId: state.activePatientId,
          entryId: Number.isFinite(numericId) ? numericId : entryKey,
          onlyEntry: true,
        });
      });
    });
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
  updateAttachmentsMetaForPatient(patientId);

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

  renderTimeline(sortedEntries, patientId);

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
  renderTimeline(sortedEntries, state.activePatientId);
  updateAttachmentsMetaForPatient(state.activePatientId);
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
  resetSelectedAttachments();
  updateAttachmentsMetaForPatient(null);

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

    const formData = new FormData();
    formData.append('patientId', String(Number(selectedPatientId)));
    formData.append('medicalInform', medicalInform);
    if (entryDate) formData.append('entryDate', entryDate);
    if (treatment) formData.append('treatment', treatment);
    if (recipe) formData.append('recipe', recipe);
    if (state.formVisitId !== null && state.formVisitId !== undefined) {
      formData.append('visitId', String(state.formVisitId));
    }

    state.selectedAttachments.forEach((file) => {
      formData.append('attachments', file);
    });

    const response = await fetch(`${BACK_ENDPOINT}/api/medical-history`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
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
    resetSelectedAttachments();
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

  updateMetaFromForm();

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
attachmentsInput?.addEventListener('change', handleAttachmentsInputChange);
attachmentsOpenButton?.addEventListener('click', () => {
  openAttachmentsOverlay({ patientId: state.activePatientId });
});
attachmentsOverlayCloseButtons.forEach((button) => {
  button.addEventListener('click', closeAttachmentsOverlay);
});
searchInput?.addEventListener('input', handleSearchInput);

patientSelect?.addEventListener('change', () => {
  updateMetaFromForm();
});

entryDateInput?.addEventListener('change', updateMetaFromForm);
entryDateInput?.addEventListener('input', updateMetaFromForm);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal && !modal.hidden) {
    closePanel();
  }
});

(async () => {
  await loadEntries();
  await attemptPrefill();
})();