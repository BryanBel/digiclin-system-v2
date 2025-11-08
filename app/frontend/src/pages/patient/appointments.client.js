import AuthModule from "../../features/auth/authModule.js";
import apiClient from "../../utils/apiClient.js";

const tableBody = document.querySelector("[data-patient-appointments]");
const filterButtons = document.querySelectorAll("[data-appointments-filter]");

const STATUS_LABELS = {
  confirmed: "Confirmada",
  pending: "Pendiente",
  cancelled: "Cancelada",
  completed: "Completada",
  reschedule: "Reprogramación solicitada",
  rejected: "Rechazada",
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
  note:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h9l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M13 3v5h5"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>',
  info:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  status:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
};

let currentView = "upcoming";
let cachedUser = null;

const ensurePatient = async () => {
  if (cachedUser) return cachedUser;

  try {
    const user = await AuthModule.getLoggedUser();
    if (!user) {
      location.replace("/login");
      return null;
    }

    if (user.role !== "patient") {
      location.replace("/");
      return null;
    }

    cachedUser = user;
    return user;
  } catch (error) {
    console.error("No se pudo validar la sesión del paciente:", error);
    location.replace("/login");
    return null;
  }
};

const formatDateTime = (value) => {
  if (!value) return "-";
  try {
    const date = new Date(value);
    return date.toLocaleString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
};

const escapeHtml = (value) => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const renderLines = (lines = []) =>
  lines
    .filter((line) => line && line.text)
    .map(({ icon, text, muted }) => {
      const iconMarkup = icon
        ? `<span class="records-icon" aria-hidden="true">${icon}</span>`
        : "";
      const lineClass = `records-entry-line${muted ? " records-entry-line--muted" : ""}`;
      return `<div class="${lineClass}">${iconMarkup}<span>${escapeHtml(text)}</span></div>`;
    })
    .join("");

const describeRequestSlot = (request) => {
  const label = request.preferred_date
    ? formatDateTime(request.preferred_date)
    : "Por confirmar";

  const lines = [];
  if (request.preferred_time_range) {
    lines.push({ icon: ICONS.clock, text: `Horario preferido: ${request.preferred_time_range}` });
  }
  if (request.created_at) {
    lines.push({ icon: ICONS.clipboard, text: `Registrada el ${formatDateTime(request.created_at)}` });
  }

  return {
    label,
    lines,
  };
};

const describeAppointmentMeta = (appointment) => {
  const lines = [];
  if (appointment.created_at) {
    lines.push({ icon: ICONS.clipboard, text: `Creada el ${formatDateTime(appointment.created_at)}` });
  }
  if (appointment.channel && appointment.channel !== "public") {
    lines.push({ icon: ICONS.info, text: `Canal: ${appointment.channel}` });
  }
  if (appointment.additional_notes) {
    lines.push({ icon: ICONS.note, text: appointment.additional_notes, muted: true });
  }
  return lines;
};

const getEntryBadge = (entry) => {
  if (entry.__type === "request") {
    const isReschedule = entry.status === "reschedule";
    return {
      label: isReschedule ? "Reprogramación" : "Solicitud",
      variant: isReschedule ? "reschedule" : "request",
    };
  }

  const status = entry.status ?? "";
  if (status === "completed") {
    return { label: "Cita completada", variant: "completed" };
  }
  if (status === "cancelled") {
    return { label: "Cita cancelada", variant: "cancelled" };
  }
  if (status === "pending") {
    return { label: "Cita pendiente", variant: "pending" };
  }
  return { label: "Cita", variant: "appointment" };
};

const renderBadge = (entry) => {
  const badge = getEntryBadge(entry);
  if (!badge) return "";
  const variantClass = badge.variant ? ` records-badge--${badge.variant}` : "";
  return `<span class="records-badge${variantClass}">${escapeHtml(badge.label)}</span>`;
};

const resolveSortTimestamp = (primary, secondary) => {
  if (primary) {
    const value = new Date(primary).getTime();
    if (!Number.isNaN(value)) return value;
  }

  if (secondary) {
    const value = new Date(secondary).getTime();
    if (!Number.isNaN(value)) return value;
  }

  return Number.POSITIVE_INFINITY;
};

const prepareEntries = ({ appointments = [], requests = [], view }) => {
  const normalizedAppointments = appointments.map((appointment) => ({
    ...appointment,
    __type: "appointment",
    sortTimestamp: resolveSortTimestamp(appointment.scheduled_for, appointment.created_at),
  }));

  const normalizedRequests = requests.map((request) => ({
    ...request,
    __type: "request",
    sortTimestamp: resolveSortTimestamp(request.preferred_date, request.created_at),
  }));

  const multiplier = view === "all" ? -1 : 1;

  return [...normalizedAppointments, ...normalizedRequests].sort((a, b) => {
    const aValue = a.sortTimestamp;
    const bValue = b.sortTimestamp;

    const aIsFinite = Number.isFinite(aValue);
    const bIsFinite = Number.isFinite(bValue);

    if (!aIsFinite && !bIsFinite) return 0;
    if (!aIsFinite) return 1;
    if (!bIsFinite) return -1;

    return (aValue - bValue) * multiplier;
  });
};

const setLoading = (message) => {
  if (!tableBody) return;
  tableBody.innerHTML = `
    <tr class="records-empty">
      <td colspan="4">${message}</td>
    </tr>
  `;
};

const setError = (message) => {
  if (!tableBody) return;
  tableBody.innerHTML = `
    <tr class="records-empty records-empty--error">
      <td colspan="4">${message}</td>
    </tr>
  `;
};

const renderAppointments = (entries) => {
  if (!tableBody) return;

  if (!entries.length) {
    setLoading("No tienes citas ni solicitudes en este filtro.");
    return;
  }

  tableBody.innerHTML = entries
    .map((entry) => {
      const status = entry.status ?? "";
      const statusClass = status ? `records-status records-status--${status}` : "records-status";
      const statusLabel = escapeHtml(STATUS_LABELS[status] ?? status ?? "-");
      const statusIcon = ICONS.status;

      if (entry.__type === "request") {
        const slot = describeRequestSlot(entry);
        const reason = entry.symptoms || "Solicitud de cita en revisión.";
        const scheduleMeta = renderLines(slot.lines);
        const professionalLines = renderLines([
          { icon: ICONS.user, text: "Por asignar", muted: true },
        ]);
        const reasonPill = `
          <span class="records-pill records-pill--request">
            <span class="records-icon records-icon--pill" aria-hidden="true">${ICONS.note}</span>
            <span>${escapeHtml(reason)}</span>
          </span>
        `;

        return `
          <tr class="records-row records-row--request">
            <td>
              <div class="records-entry">
                <div class="records-entry-header">
                  ${renderBadge(entry)}
                  <span class="records-entry-date">${escapeHtml(slot.label)}</span>
                </div>
                ${scheduleMeta}
              </div>
            </td>
            <td>
              <div class="records-entry">
                ${professionalLines}
              </div>
            </td>
            <td>
              <div class="records-entry">
                ${reasonPill}
              </div>
            </td>
            <td>
              <div class="records-entry records-entry--status">
                <span class="${statusClass}">
                  <span class="records-icon records-icon--status" aria-hidden="true">${statusIcon}</span>
                  ${statusLabel}
                </span>
              </div>
            </td>
          </tr>
        `;
      }

      const doctorDisplay = entry.doctor_name || entry.doctor_email || "Profesional por confirmar";
      const reason = entry.reason || "-";
      const appointmentMeta = renderLines(describeAppointmentMeta(entry));
      const professionalLines = renderLines([
        {
          icon: ICONS.user,
          text: doctorDisplay,
          muted: !entry.doctor_name,
        },
        entry.doctor_email
          ? { icon: ICONS.mail, text: entry.doctor_email, muted: true }
          : null,
      ]);
      const reasonPill = `
        <span class="records-pill">
          <span class="records-icon records-icon--pill" aria-hidden="true">${ICONS.note}</span>
          <span>${escapeHtml(reason)}</span>
        </span>
      `;

      return `
        <tr class="records-row records-row--appointment">
          <td>
            <div class="records-entry">
              <div class="records-entry-header">
                ${renderBadge(entry)}
                <span class="records-entry-date">${escapeHtml(formatDateTime(entry.scheduled_for))}</span>
              </div>
              ${appointmentMeta}
            </div>
          </td>
          <td>
            <div class="records-entry">
              ${professionalLines}
            </div>
          </td>
          <td>
            <div class="records-entry">
              ${reasonPill}
            </div>
          </td>
          <td>
            <div class="records-entry records-entry--status">
              <span class="${statusClass}">
                <span class="records-icon records-icon--status" aria-hidden="true">${statusIcon}</span>
                ${statusLabel}
              </span>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
};

const updateActiveFilter = (view) => {
  filterButtons.forEach((button) => {
    const isActive = button.dataset.appointmentsFilter === view;
    button.classList.toggle("patient-filter--active", isActive);
  });
};

const loadAppointments = async () => {
  const user = await ensurePatient();
  if (!user) return;

  setLoading("Cargando citas...");

  try {
    const response = await apiClient.get("/api/appointments/mine", {
      searchParams: currentView === "all" ? undefined : { view: currentView },
    });
    const data = await response.json();
    const appointments = Array.isArray(data.appointments) ? data.appointments : [];
    const requests = Array.isArray(data.requests) ? data.requests : [];
    const entries = prepareEntries({ appointments, requests, view: currentView });
    renderAppointments(entries);
  } catch (error) {
    console.error("No se pudieron cargar las citas del paciente:", error);
    const message = error?.message || "No se pudieron cargar las citas.";
    setError(message);
  }
};

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const view = button.dataset.appointmentsFilter;
    if (!view || view === currentView) return;
    currentView = view;
    updateActiveFilter(view);
    loadAppointments();
  });
});

updateActiveFilter(currentView);
loadAppointments();
