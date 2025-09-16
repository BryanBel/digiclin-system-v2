
import { atom } from "nanostores";
import ky from "ky";
import { createNotification } from "../notifications/notification.js";
import { BACK_ENDPOINT } from "../../config/endpoints.js";

const BASE_URL = `${BACK_ENDPOINT}/api/patients`;

/** 
  * @typedef Patient
  * @type {object}
  * @property {string} id The id of the patient
  * @property {string} name The name of the patient
*/

/** @type {import("nanostores").Atom<Patient[]>} */
export const patients = atom([]);

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
    }
  },

  addPatient: async (patientToCreate) => {
    try {
      const patientCreated = await ky.post(BASE_URL, { json: patientToCreate, credentials: 'include' }).json();
      patients.set(patients.get().concat(patientCreated));
      createNotification({ title: 'Patient created!', type: 'success' });
    } catch (error) {
      console.error("Failed to add patient:", error);
      const errorData = await error.response.json();
      createNotification({
        title: 'Error creating patient',
        description: errorData.error,
        type: 'error'
      });
    }
  },

  updatePatient: async (patientToUpdate) => {
    const url = `${BASE_URL}/${patientToUpdate.id}`;
    try {
      const patientUpdated = await ky.put(url, { json: patientToUpdate, credentials: 'include' }).json();
      patients.set(patients.get().map(p => p.id === patientUpdated.id ? patientUpdated : p));
      createNotification({ title: 'Patient updated', type: 'success' });
    } catch (error) {
      console.error("Failed to update patient:", error);
      const errorData = await error.response.json();
      createNotification({
        title: 'Error updating patient',
        description: errorData.error,
        type: 'error'
      });
    }
  },

  removePatient: async (id) => {
    const url = `${BASE_URL}/${id}`;
    try {
      const patientDeleted = await ky.delete(url, { credentials: 'include' }).json();
      patients.set(patients.get().filter(p => p.id !== patientDeleted.id));
      createNotification({ title: 'Patient removed', type: 'success' });
    } catch (error) {
      console.error("Failed to remove patient:", error);
      const errorData = await error.response.json();
      createNotification({
        title: 'Error removing patient',
        description: errorData.error,
        type: 'error'
      });
    }
  }
};

export default PatientsModule;
