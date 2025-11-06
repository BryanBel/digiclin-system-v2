import { BACK_ENDPOINT } from '../../config/endpoint.js';
import { createNotification } from '../../features/notifications/notification.js';

const tableBody = document.querySelector('[data-patients-body]');
const panel = document.querySelector('[data-patient-panel]');
const grid = document.querySelector('.admin-grid');
const shell = document.querySelector('.admin-shell');
const panelDescription = document.querySelector('[data-panel-description]');
const panelName = document.querySelector('[data-panel-name]');
const panelDocument = document.querySelector('[data-panel-document]');
const panelAge = document.querySelector('[data-panel-age]');
const panelGender = document.querySelector('[data-panel-gender]');
const panelAppointments = document.querySelector('[data-panel-appointments]');
const panelLastAppointment = document.querySelector('[data-panel-last-appointment]');
const form = document.querySelector('#patient-form');
const feedback = document.querySelector('#patient-feedback');
const submitButton = document.querySelector('[data-patient-submit]');
const closeButton = document.querySelector('[data-close-patient-panel]');
const searchInput = document.querySelector('[data-patient-search]');

const GENDER_LABELS = {
  male: 'Masculino',
  female: 'Femenino',
  other: 'Otro',
};

const state = {
  patients: [],
  activePatient: null,
  currentSearch: '',
  debounceTimer: null,
};

const calculateAge = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
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
      day: '2-digit',
    });
  } catch {
    return value;
  }
};

const renderTable = () => {
  if (!state.patients.length) {
    tableBody.innerHTML = `
      <tr class="admin-empty">
        <td colspan="6">No se encontraron pacientes.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = state.patients
    .map((patient) => {
      const computedAge = patient.age ?? calculateAge(patient.birth_date);
      return `
        <tr class="admin-patient-row" data-patient-row="${patient.id}">
          <td>
            <div class="admin-cell admin-cell--person">
              <strong>${patient.full_name}</strong>
              <div class="admin-patient-meta">
                ${patient.birth_date ? `<span>Nacimiento: ${formatDateOnly(patient.birth_date)}</span>` : ''}
                ${patient.gender ? `<span>Género: ${GENDER_LABELS[patient.gender] ?? patient.gender}</span>` : ''}
              </div>
              <div class="admin-row-hint">EDITAR</div>
            </div>
          </td>
          <td>
            <div class="admin-cell">${patient.document_id ?? 'Sin documento'}</div>
          </td>
          <td>
            <div class="admin-cell admin-cell--stack">
              <div>${patient.email ?? 'Sin correo'}</div>
              <div>${patient.phone ?? 'Sin teléfono'}</div>
            </div>
          </td>
          <td>
            <div class="admin-cell">${typeof computedAge === 'number' ? `${computedAge} años` : 'Sin registro'}</div>
          </td>
          <td>
            <div class="admin-cell">${formatDateTime(patient.last_appointment_at)}</div>
          </td>
          <td>
            <div class="admin-cell">${patient.appointments_count ?? 0}</div>
          </td>
        </tr>
      `;
    })
    .join('');
};

const attachRowListeners = () => {
  tableBody.querySelectorAll('[data-patient-row]').forEach((row) => {
    row.addEventListener('click', () => openPanel(Number(row.dataset.patientRow)));
  });
};

const openPanel = (patientId) => {
  const patient = state.patients.find((item) => item.id === patientId);
  if (!patient) return;

  state.activePatient = patient;

  panelDescription.textContent = 'Actualiza los datos de contacto y verificación del paciente.';
  panelName.textContent = patient.full_name ?? '-';
  panelDocument.textContent = patient.document_id ?? 'Sin documento';
  const ageLabel = patient.age ?? calculateAge(patient.birth_date);
  panelAge.textContent = typeof ageLabel === 'number' ? `${ageLabel} años` : 'Sin registro';
  panelGender.textContent = GENDER_LABELS[patient.gender] ?? 'Sin registro';
  panelAppointments.textContent = patient.appointments_count ?? 0;
  panelLastAppointment.textContent = formatDateTime(patient.last_appointment_at);

  if (form) {
    const fullNameInput = form.elements.namedItem('fullName');
    const documentInput = form.elements.namedItem('documentId');
    const birthDateInput = form.elements.namedItem('birthDate');
    const genderSelect = form.elements.namedItem('gender');
    const phoneInput = form.elements.namedItem('phone');
    const emailInput = form.elements.namedItem('email');

    if (fullNameInput) fullNameInput.value = patient.full_name ?? '';
    if (documentInput) documentInput.value = patient.document_id ?? '';
    if (birthDateInput) birthDateInput.value = patient.birth_date ? patient.birth_date.slice(0, 10) : '';
    if (genderSelect) genderSelect.value = patient.gender ?? '';
    if (phoneInput) phoneInput.value = patient.phone ?? '';
    if (emailInput) emailInput.value = patient.email ?? '';
  }

  feedback.textContent = '';
  feedback.className = 'admin-feedback';
  panel.hidden = false;
  grid?.classList.add('admin-grid--with-panel');
  shell?.classList.add('admin-shell--panel-open');
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const closePanel = () => {
  state.activePatient = null;
  panel.hidden = true;
  feedback.textContent = '';
  feedback.className = 'admin-feedback';
  grid?.classList.remove('admin-grid--with-panel');
  shell?.classList.remove('admin-shell--panel-open');
};

const loadPatients = async () => {
  tableBody.innerHTML = `
    <tr class="admin-empty">
      <td colspan="6">Cargando pacientes...</td>
    </tr>
  `;

  try {
    const params = new URLSearchParams();
    if (state.currentSearch.trim()) {
      params.set('search', state.currentSearch.trim());
    }
    const queryString = params.toString();
    const url = queryString
      ? `${BACK_ENDPOINT}/api/patients?${queryString}`
      : `${BACK_ENDPOINT}/api/patients`;

    const response = await fetch(url, {
      credentials: 'include',
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error ?? 'No se pudieron cargar los pacientes');
    }

    state.patients = Array.isArray(data.patients) ? data.patients : [];
    renderTable();
    attachRowListeners();

    if (state.activePatient) {
      const updated = state.patients.find((item) => item.id === state.activePatient.id);
      if (updated) {
        openPanel(updated.id);
      } else {
        closePanel();
      }
    }
  } catch (error) {
    tableBody.innerHTML = `
      <tr class="admin-empty">
        <td colspan="6">${error.message}</td>
      </tr>
    `;
    console.error('Error cargando pacientes:', error);
  }
};

const handleFormSubmit = async (event) => {
  event.preventDefault();
  if (!state.activePatient) return;

  const formData = new FormData(form);
  const fullName = formData.get('fullName')?.toString().trim();
  const documentId = formData.get('documentId')?.toString().trim();
  const birthDate = formData.get('birthDate')?.toString();
  const gender = formData.get('gender')?.toString().trim();
  const phone = formData.get('phone')?.toString().trim();
  const email = formData.get('email')?.toString().trim();
  const computedAge = birthDate ? calculateAge(birthDate) : null;

  feedback.textContent = '';
  feedback.className = 'admin-feedback';
  submitButton.disabled = true;
  submitButton.textContent = 'Guardando...';

  try {
    const response = await fetch(`${BACK_ENDPOINT}/api/patients/${state.activePatient.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        fullName,
        documentId,
        birthDate: birthDate || undefined,
        gender: gender || undefined,
        phone: phone || undefined,
        email: email || undefined,
  age: typeof computedAge === 'number' ? computedAge : undefined,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data?.error ?? 'No se pudo actualizar el paciente');

    createNotification({
      title: 'Paciente actualizado',
      description: 'Los datos fueron guardados correctamente.',
      type: 'success',
    });

    feedback.textContent = 'Cambios guardados correctamente.';
    feedback.className = 'admin-feedback admin-feedback--success';

    await loadPatients();
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
    submitButton.textContent = 'Guardar cambios';
  }
};

const handleSearchInput = (event) => {
  const value = event.target.value;
  state.currentSearch = value;

  if (state.debounceTimer) {
    clearTimeout(state.debounceTimer);
  }

  state.debounceTimer = setTimeout(() => {
    loadPatients();
  }, 300);
};

form?.addEventListener('submit', handleFormSubmit);
closeButton?.addEventListener('click', closePanel);
searchInput?.addEventListener('input', handleSearchInput);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !panel.hidden) {
    closePanel();
  }
});

loadPatients();
