import React, { useState, useEffect } from 'react';
import { UserIcon } from '@heroicons/react/24/outline';
import CreateMedicalHistoryForm from '../components/CreateMedicalHistoryForm.jsx';

/**
 * @typedef {object} Patient
 * @property {string} id
 * @property {string} name
 */

const MedicalHistoryPageContent = () => {
  /** @type {string} */
  const [selectedPatientId, setSelectedPatientId] = useState('');
  /** @type {Patient[]} */
  const [patients, setPatients] = useState([]);
  /** @type {string} */
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/patients`, {
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        /** @type {Patient[]} */
        const data = await response.json();
        setPatients(data);
      } catch (err) {
        console.error('Failed to fetch patients:', err);
        setError('Error al cargar pacientes.');
      }
    };
    fetchPatients();
  }, []);

  const handlePatientSelect = (e) => {
    const patientId = e.target.value;
    setSelectedPatientId(patientId);
    if (patientId) {
      window.location.href = `/medical-history/${patientId}`;
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4">
      <h1 className="text-4xl font-extrabold mb-10 flex items-center gap-3 text-purple-900 drop-shadow-lg">
        <UserIcon className="h-14 w-14 text-purple-700" />
        Historia Clínica
      </h1>
      <p className="text-gray-700 mb-8">Administración y gestión del historial médico de los pacientes.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <CreateMedicalHistoryForm />
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4 text-purple-800">Ver Historial por Paciente</h2>
          {error && <p className="text-red-500 mb-4">{error}</p>}

          <div className="mb-4">
            <label htmlFor="selectPatient" className="block text-gray-700 text-sm font-bold mb-2">
              Seleccionar Paciente:
            </label>
            <select
              id="selectPatient"
              value={selectedPatientId}
              onChange={handlePatientSelect}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="">Selecciona un paciente</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalHistoryPageContent;
