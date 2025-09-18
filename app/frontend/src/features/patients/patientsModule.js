
import { atom } from "nanostores";
import ky from "ky";
import { createNotification } from "../notifications/notification.js";
import { BACK_ENDPOINT } from "../../config/endpoint.js";

const BASE_URL = `${BACK_ENDPOINT}/api/patients`;

/** 
  * @typedef Patient
  * @type {object}
  * @property {string} id The id of the patient
  * @property {string} name The name of the patient
  * @property {string | null} cedula The national ID of the patient
  * @property {string | null} phone The phone number of the patient
*/

/** @type {import("nanostores").Atom<Patient[]>} */
export const patients = atom([]);

/** @type {import("nanostores").Atom<Patient | null>} */
export const currentPatient = atom(null);

const PatientsModule = {
  getPatients: async () => {
    try {
      const patientsData = await ky.get(BASE_URL, { credentials: 'include' }).json();
      patients.set(patientsData);
    } catch (error) {
      console.error("Failed to fetch patients:", error);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        location.replace('/login');
      }
      // Re-throw so the UI layer can handle it
      throw error;
    }
  },

  getPatientById: async (id) => {
    const url = `${BASE_URL}/${id}`;
    try {
      const patientData = await ky.get(url, { credentials: 'include' }).json();
      currentPatient.set(patientData);
    } catch (error) {
      console.error(`Failed to fetch patient with id ${id}:`, error);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        location.replace('/login');
      }
      // Re-throw the error so the calling component can handle UI updates
      const errorData = await error.response.json();
      // This makes the error message available in the .catch() block on the page
      throw new Error(errorData.error || 'Error al obtener los datos del paciente.');
    }
  },

  addPatient: async (patientToCreate) => {
    try {
      const patientCreated = await ky.post(BASE_URL, { json: patientToCreate, credentials: 'include' }).json();
      patients.set(patients.get().concat(patientCreated));
      createNotification({ title: 'Paciente creado!', type: 'success' });
    } catch (error) {
      const errorData = await error.response.json();
      const errorMessage = errorData.error || 'Ocurrió un error desconocido al añadir el paciente.';
      console.error("Failed to add patient:", errorMessage);
      createNotification({
        title: 'Error creating patient',
        description: errorMessage,
        type: 'error'
      });
      // Re-throw a new, more specific error for the form to display
      throw new Error(errorMessage);
    }
  },

  updatePatient: async (patientToUpdate) => {
    const url = `${BASE_URL}/${patientToUpdate.id}`;
    try {
      const patientUpdated = await ky.put(url, { json: patientToUpdate, credentials: 'include' }).json();
      patients.set(patients.get().map(p => p.id === patientUpdated.id ? patientUpdated : p));
      if (currentPatient.get()?.id === patientUpdated.id) {
        currentPatient.set(patientUpdated);
      }
      createNotification({ title: 'Paciente actualizado', type: 'success' });
    } catch (error) {
      const errorData = await error.response.json();
      const errorMessage = errorData.error || 'Ocurrió un error desconocido al actualizar el paciente.';
      console.error("Failed to update patient:", errorMessage);
      createNotification({
        title: 'Error updating patient',
        description: errorMessage,
        type: 'error'
      });
      throw new Error(errorMessage);
    }
  },

  removePatient: async (id) => {
    const url = `${BASE_URL}/${id}`;
    try {
      // The backend now correctly returns the ID of the deleted patient
      const { id: deletedId } = await ky.delete(url, { credentials: 'include' }).json();
      // Convert the returned string ID to a number for correct comparison
      patients.set(patients.get().filter(p => p.id !== Number(deletedId)));
      createNotification({ title: 'Paciente eliminado', type: 'success' });
    } catch (error) {
      const errorData = await error.response.json();
      const errorMessage = errorData.error || 'Ocurrió un error desconocido al eliminar el paciente.';
      console.error("Failed to remove patient:", errorMessage);
      createNotification({
        title: 'Error removing patient',
        description: errorMessage,
        type: 'error'
      });
      throw new Error(errorMessage);
    }
  }
};

export default PatientsModule;
