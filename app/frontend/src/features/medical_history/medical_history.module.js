import { atom } from 'nanostores';
import ky from 'ky';
import { BACK_ENDPOINT } from '../../config/endpoint.js';

const BASE_URL = `${BACK_ENDPOINT}/api/medical-history`;

export const history = atom([]);

const MedicalHistoryModule = {
  getHistoryByPatientId: async (patientId) => {
    try {
      const historyData = await ky
        .get(`${BASE_URL}/patient/${patientId}`, { credentials: 'include' })
        .json();
      history.set(historyData);
    } catch (error) {
      console.error('Failed to fetch medical history:', error);
      history.set([]);
    }
  },
  addHistoryEntry: async (entryData) => {
    try {
      await ky.post(BASE_URL, {
        json: entryData,
        credentials: 'include',
      }).json();
      // After adding, re-fetch the history to update the list
      await MedicalHistoryModule.getHistoryByPatientId(entryData.patient_id);
    } catch (error) {
      console.error('Failed to add medical history entry:', error);
      throw error;
    }
  },
};

export default MedicalHistoryModule;
