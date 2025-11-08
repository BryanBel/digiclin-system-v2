import AuthModule from "../../features/auth/authModule.js";
import { BACK_ENDPOINT } from "../../config/endpoint.js";
import apiClient from "../../utils/apiClient.js";

const historyContainer = document.querySelector("[data-patient-history]");
const summaryCard = document.querySelector("[data-patient-summary]");
const summaryName = document.querySelector("[data-summary-name]");
const summaryDocument = document.querySelector("[data-summary-document]");
const summaryEmail = document.querySelector("[data-summary-email]");
const summaryPhone = document.querySelector("[data-summary-phone]");
const summaryUpdated = document.querySelector("[data-summary-updated]");

let cachedUser = null;
let cachedPatientProfile = null;

const PILL_ICON_MARKUP = `
  <span class="records-icon records-icon--pill" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7 3h9l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path>
      <path d="M13 3v5h5"></path>
      <line x1="9" y1="13" x2="15" y2="13"></line>
      <line x1="9" y1="17" x2="13" y2="17"></line>
    </svg>
  </span>
`;

const ICONS = {
  user:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></svg>',
  mail:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>',
  phone:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92V19a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3 5.18 2 2 0 0 1 5 3h2.09a1 1 0 0 1 1 .75l1.13 4.52a1 1 0 0 1-.29 1L7.91 11a16 16 0 0 0 5.09 5.09l1.73-1.73a1 1 0 0 1 1 .27l3.11 3.11a1 1 0 0 1 .16 1.11z"/></svg>',
  id:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><circle cx="9" cy="13" r="2"/><path d="M13 16h4"/></svg>',
};

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>'"]/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });

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

const formatDate = (value) => {
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

const formatSummaryDate = (value) => {
  if (!value) return "Sin registros";
  try {
    const date = new Date(value);
    return `Actualizado ${date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`;
  } catch {
    return "Actualizado";
  }
};

const normalizePatientProfile = (patient, fallbackUser) => {
  if (!patient && !fallbackUser) {
    return {
      name: null,
      documentId: null,
      email: null,
      phone: null,
    };
  }

  const safe = patient ?? {};
  const fallback = fallbackUser ?? {};

  return {
    name:
      safe.name ??
      safe.fullName ??
      safe.full_name ??
      fallback.full_name ??
      fallback.fullName ??
      null,
    documentId: safe.documentId ?? safe.document_id ?? null,
    email: safe.email ?? fallback.email ?? null,
    phone: safe.phone ?? null,
  };
};

const updateSummaryCard = ({ patient, updatedAt }) => {
  if (!summaryCard) return;

  const normalized = normalizePatientProfile(patient, cachedUser);

  if (summaryName) summaryName.textContent = normalized.name ?? "Sin registro";
  if (summaryDocument) summaryDocument.textContent = normalized.documentId ?? "Sin documento";
  if (summaryEmail) summaryEmail.textContent = normalized.email ?? "Sin correo";
  if (summaryPhone) summaryPhone.textContent = normalized.phone ?? "Sin teléfono";
  if (summaryUpdated) summaryUpdated.textContent = formatSummaryDate(updatedAt);

  summaryCard.hidden = false;
};

const normaliseText = (value) => {
  if (!value || !String(value).trim()) {
    return '<span class="patient-history__placeholder">Sin información</span>';
  }

  const escaped = escapeHtml(String(value).trim()).replace(/\n{2,}/g, '\n');
  return escaped.replace(/\n/g, '<br />');
};

const summarizeText = (value, maxLength = 140) => {
  if (!value) return null;
  const normalized = String(value).replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1).trim()}…` : normalized;
};

const renderMetaLine = (iconMarkup, text, { muted = false } = {}) => {
  if (!text) return "";
  const trimmed = String(text).trim();
  if (!trimmed) return "";
  const icon = iconMarkup
    ? `<span class="records-icon" aria-hidden="true">${iconMarkup}</span>`
    : "";
  const lineClass = `records-entry-line${muted ? " records-entry-line--muted" : ""}`;
  return `<div class="${lineClass}">${icon}<span>${escapeHtml(trimmed)}</span></div>`;
};

const buildAttachmentHref = (url) => {
  if (!url) return "";
  const trimmedBackend = (BACK_ENDPOINT ?? "").trim();
  if (!trimmedBackend) {
    return url;
  }

  const normalized = url.startsWith("/") ? url : `/${url}`;
  return `${trimmedBackend.replace(/\/+$/, "")}${normalized}`;
};

const setLoading = (message, modifier = "") => {
  if (!historyContainer) return;
  const className = modifier ? `records-empty ${modifier}` : "records-empty";
  historyContainer.innerHTML = `
    <tr class="${className}">
      <td colspan="4">${escapeHtml(message)}</td>
    </tr>
  `;
};

const setError = (message) => {
  if (!historyContainer) return;
  setLoading(message, "records-empty--error");
};

const formatFileSize = (bytes) => {
  if (!bytes || Number.isNaN(bytes) || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const buildAttachmentMeta = (attachment) => {
  if (!attachment) return null;
  const parts = [];
  const type = attachment.mimetype ? attachment.mimetype.split("/")?.[1] ?? null : null;

  if (type) {
    parts.push(type.toUpperCase());
  }

  const size = formatFileSize(Number(attachment.size));
  if (size) {
    parts.push(size);
  }

  return parts.length ? parts.join(" | ") : null;
};

const renderEntries = (entries, patientContext) => {
  if (!historyContainer) return;

  if (!entries.length) {
    setLoading("Aún no tienes registros clínicos disponibles.");
    return;
  }

  historyContainer.innerHTML = entries
    .map((entry, index) => {
      const doctorName = entry.doctor?.name || "Profesional asignado";
      const doctorEmail = entry.doctor?.email || null;
      const attachments = Array.isArray(entry.attachments)
        ? entry.attachments.filter(Boolean)
        : [];
      const normalizedPatient = normalizePatientProfile(entry.patient ?? patientContext, cachedUser);
      const entryNumber = index + 1;

      const patientMetaLines = [
        normalizedPatient.documentId
          ? renderMetaLine(ICONS.id, `Documento: ${normalizedPatient.documentId}`)
          : "",
        normalizedPatient.email
          ? renderMetaLine(ICONS.mail, `Correo: ${normalizedPatient.email}`, { muted: true })
          : "",
        normalizedPatient.phone
          ? renderMetaLine(ICONS.phone, `Teléfono: ${normalizedPatient.phone}`)
          : "",
      ]
        .filter(Boolean)
        .join("");

      const patientMeta = patientMetaLines
        ? `<div class="patient-history__meta">${patientMetaLines}</div>`
        : "";

      const professionalLines = [
        renderMetaLine(ICONS.user, `Profesional: ${doctorName}`, {
          muted: doctorName === "Profesional asignado",
        }),
        doctorEmail ? renderMetaLine(ICONS.mail, `Correo: ${doctorEmail}`, { muted: true }) : "",
      ]
        .filter(Boolean)
        .join("");

      const professionalContent =
        professionalLines ||
        '<span class="patient-history__placeholder">Sin profesional asignado</span>';

      const attachmentsCount = attachments.length;
      const attachmentsSummary = attachmentsCount
        ? `${attachmentsCount} archivo${attachmentsCount === 1 ? "" : "s"} adjunto${
            attachmentsCount === 1 ? "" : "s"
          }`
        : null;

      const attachmentsList = attachmentsCount
        ? `
            <ul class="patient-history__attachments-list">
              ${attachments
                .map((attachment) => {
                  const safeName = escapeHtml(
                    attachment.name || attachment.filename || "Archivo adjunto",
                  );
                  const href = attachment.url ? escapeHtml(buildAttachmentHref(attachment.url)) : "";
                  const meta = buildAttachmentMeta(attachment);
                  const metaLabel = meta
                    ? `<span class="patient-history__attachment-meta">(${escapeHtml(meta)})</span>`
                    : "";
                  const pillLabel = `<span>${safeName}${metaLabel}</span>`;
                  const pillInner = `${PILL_ICON_MARKUP}${pillLabel}`;

                  if (!href) {
                    return `
                      <li>
                        <span class="records-pill records-pill--request patient-history__attachment-pill" role="text">
                          ${pillInner}
                        </span>
                      </li>
                    `;
                  }

                  return `
                    <li>
                      <a
                        class="records-pill records-pill--request patient-history__attachment-pill"
                        href="${href}"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        ${pillInner}
                      </a>
                    </li>
                  `;
                })
                .join("")}
            </ul>
          `
        : '<span class="patient-history__attachments-empty">Sin archivos adjuntos</span>';

      const attachmentsSection = `
        <div class="patient-history__attachments">
          ${
            attachmentsSummary
              ? `<span class="patient-history__info-line patient-history__info-line--highlight">${escapeHtml(
                  attachmentsSummary
                )}</span>`
              : ""
          }
          ${attachmentsList}
        </div>
      `;

      const motivationSummary =
        summarizeText(entry.medicalInform) ?? "Sin diagnóstico registrado";
      const motivationPill = `
        <span class="records-pill records-pill--request patient-history__detail-pill">
          ${PILL_ICON_MARKUP}
          <span>${escapeHtml(motivationSummary)}</span>
        </span>
      `;

      const detailSections = [
        { label: "Diagnóstico", value: entry.medicalInform },
        { label: "Tratamiento", value: entry.treatment },
        { label: "Receta", value: entry.recipe },
      ]
        .map(({ label, value }) => {
          if (!value || !String(value).trim()) return "";
          return `
            <section class="patient-history__detail-section">
              <span class="patient-history__section-title">${label}</span>
              <div class="patient-history__text">${normaliseText(value)}</div>
            </section>
          `;
        })
        .filter(Boolean)
        .join("");

      const detailContent =
        detailSections ||
        '<p class="patient-history__placeholder">Sin información clínica registrada.</p>';

      return `
        <tr class="records-row records-row--history">
          <td>
            <div class="records-entry patient-history__date">
              <div class="records-entry-header">
                <span class="records-badge records-badge--history">${escapeHtml(
                  `Registro #${entryNumber}`,
                )}</span>
                <span class="records-entry-date">${escapeHtml(formatDate(entry.entryDate))}</span>
              </div>
              <span class="records-entry-title">${escapeHtml(
                normalizedPatient.name ?? "Paciente sin nombre",
              )}</span>
              ${patientMeta}
            </div>
          </td>
          <td>
            <div class="records-entry patient-history__professional">
              ${professionalContent}
              <span class="patient-history__doctor-badge">Profesional tratante</span>
            </div>
          </td>
          <td>
            <div class="patient-history__detail">
              ${motivationPill}
              ${detailContent}
            </div>
          </td>
          <td>
            <div class="patient-history__attachments-cell">
              ${attachmentsSection}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
};

const sortEntriesDesc = (entries) =>
  [...entries].sort((a, b) => {
    const dateA = a.entryDate ? new Date(a.entryDate).getTime() : 0;
    const dateB = b.entryDate ? new Date(b.entryDate).getTime() : 0;
    return dateB - dateA;
  });

const loadHistory = async () => {
  const user = await ensurePatient();
  if (!user) return;

  setLoading("Cargando historial...");

  try {
    const response = await apiClient.get("/api/medical-history/my");
    const data = await response.json();
    const entries = Array.isArray(data.entries) ? data.entries : [];
    const sortedEntries = sortEntriesDesc(entries);

    if (!cachedPatientProfile) {
      try {
        const patientResponse = await apiClient.get("/api/patients/me");
        const patientData = await patientResponse.json();
        cachedPatientProfile = patientData?.patient ?? null;
      } catch (profileError) {
        console.warn("No se pudo recuperar el perfil del paciente:", profileError);
      }
    }

    const fallbackPatient = {
      fullName: user.full_name ?? user.fullName ?? null,
      email: user.email ?? null,
    };

    const primaryEntryPatient = sortedEntries[0]?.patient ?? null;
    const patientForSummary = cachedPatientProfile ?? primaryEntryPatient ?? fallbackPatient;
    const patientForRows = primaryEntryPatient ?? cachedPatientProfile ?? fallbackPatient;

    updateSummaryCard({
      patient: patientForSummary,
      updatedAt: sortedEntries[0]?.entryDate ?? null,
    });

    renderEntries(sortedEntries, patientForRows);
  } catch (error) {
    console.error("No se pudo recuperar el historial clínico del paciente:", error);
    const message = error?.message || "No se pudo cargar el historial.";
    setError(message);
    if (cachedPatientProfile || cachedUser) {
      updateSummaryCard({
        patient: cachedPatientProfile ?? { fullName: cachedUser?.full_name, email: cachedUser?.email },
        updatedAt: null,
      });
    }
  }
};

loadHistory();
