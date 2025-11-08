import AuthModule from "../../features/auth/authModule.js";
import apiClient from "../../utils/apiClient.js";

const tableBody = document.querySelector("[data-patient-history]");
let cachedUser = null;

const escapeHtml = (value) =>
  value.replace(/[&<>'"]/g, (char) => {
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

const normaliseText = (value) => {
  if (!value || !String(value).trim()) {
    return '<span class="patient-history__placeholder">Sin información</span>';
  }

  const escaped = escapeHtml(String(value).trim()).replace(/\n{2,}/g, '\n');
  return escaped.replace(/\n/g, '<br />');
};

const setLoading = (message) => {
  if (!tableBody) return;
  tableBody.innerHTML = `
    <tr class="patient-empty">
      <td colspan="5">${message}</td>
    </tr>
  `;
};

const setError = (message) => {
  if (!tableBody) return;
  tableBody.innerHTML = `
    <tr class="patient-empty patient-empty--error">
      <td colspan="5">${message}</td>
    </tr>
  `;
};

const renderEntries = (entries) => {
  if (!tableBody) return;

  if (!entries.length) {
    setLoading("Aún no tienes registros clínicos disponibles.");
    return;
  }

  tableBody.innerHTML = entries
    .map((entry) => {
      const doctorName = entry.doctor?.name || "Profesional asignado";
      const doctorEmail = entry.doctor?.email || "-";

      return `
        <tr>
          <td>${formatDate(entry.entryDate)}</td>
          <td>
            <div class="patient-history__doctor">${doctorName}</div>
            <div class="patient-history__doctor-meta">${doctorEmail}</div>
          </td>
          <td><div class="patient-history__text">${normaliseText(entry.medicalInform)}</div></td>
          <td><div class="patient-history__text">${normaliseText(entry.treatment)}</div></td>
          <td><div class="patient-history__text">${normaliseText(entry.recipe)}</div></td>
        </tr>
      `;
    })
    .join("");
};

const loadHistory = async () => {
  const user = await ensurePatient();
  if (!user) return;

  setLoading("Cargando historial...");

  try {
    const response = await apiClient.get("/api/medical-history/my");
    const data = await response.json();
    const entries = Array.isArray(data.entries) ? data.entries : [];
    renderEntries(entries);
  } catch (error) {
    console.error("No se pudo recuperar el historial clínico del paciente:", error);
    const message = error?.message || "No se pudo cargar el historial.";
    setError(message);
  }
};

loadHistory();
