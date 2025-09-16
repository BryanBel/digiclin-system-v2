import { atom } from 'nanostores';
import ky from 'ky';
import { BACK_ENDPOINT } from '../../config/endpoint.js';

const BASE_URL = `${BACK_ENDPOINT}/api/medical_history`;

export const history = atom([]);

const MedicalHistoryModule = {
  getHistoryForPatient: async (patientId) => {
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
};

export default MedicalHistoryModule;
