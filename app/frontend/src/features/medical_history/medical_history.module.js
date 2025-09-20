import { atom } from 'nanostores';
import ky from 'ky';
const BASE_URL = '/api/medical-history';

export const history = atom([]);

const MedicalHistoryModule = {
  getHistoryByPatientId: async (patientId) => {
    try {
      const historyData = await ky
        .get(`${BASE_URL}/patient/${patientId}`, { credentials: 'include' })
        .json();
      history.set(historyData);
      return historyData;
    } catch (error) {
      console.error('Failed to fetch medical history:', error);
      history.set([]);
      return [];
    }
  },
  addHistoryEntry: async (entryData) => {
    try {
      await ky.post(BASE_URL, {
        json: entryData,
        credentials: 'include',
      }).json();
      await MedicalHistoryModule.getHistoryByPatientId(entryData.patient_id);
    } catch (error) {
      console.error('Failed to add medical history entry:', error);
      throw error;
    }
  },
};

export default MedicalHistoryModule;