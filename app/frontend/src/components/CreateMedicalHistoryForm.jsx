import React, { useState, useEffect } from 'react';
import MedicalHistoryModule from '../features/medical_history/medical_history.module.js';

/**
 * @typedef {object} Patient
 * @property {string} id
 * @property {string} name
 */

const CreateMedicalHistoryForm = () => {
  /** @type {string} */
  const [medicalInform, setMedicalInform] = useState('');
  /** @type {string} */
  const [treatment, setTreatment] = useState('');
  /** @type {string} */
  const [recipe, setRecipe] = useState('');
  /** @type {string} */
  const [selectedPatient, setSelectedPatient] = useState('');
  /** @type {Patient[]} */
  const [patients, setPatients] = useState([]);
  /** @type {string} */
  const [error, setError] = useState('');
  /** @type {string} */
  const [success, setSuccess] = useState('');

  // Fetch patients on component mount
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedPatient || !medicalInform) {
      setError('Por favor, selecciona un paciente y añade la información médica.');
      return;
    }

    try {
      await MedicalHistoryModule.addHistoryEntry({
        patient_id: selectedPatient,
        description: medicalInform,
        treatment,
        recipe,
      });
      setSuccess('Entrada de historial médico creada con éxito.');
      setMedicalInform('');
      setTreatment('');
      setRecipe('');
      setSelectedPatient('');
    } catch (err) {
      console.error('Error al crear entrada de historial médico:', err);
      setError('Error al crear entrada de historial médico.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-purple-800">Crear Nueva Entrada de Historial Médico</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {success && <p className="text-green-500 mb-4">{success}</p>}

      <div className="mb-4">
        <label htmlFor="patient" className="block text-gray-700 text-sm font-bold mb-2">
          Paciente:
        </label>
        <select
          id="patient"
          value={selectedPatient}
          onChange={(e) => setSelectedPatient(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          required
        >
          <option value="">Selecciona un paciente</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="medicalInform" className="block text-gray-700 text-sm font-bold mb-2">
          Información Médica:
        </label>
        <textarea
          id="medicalInform"
          value={medicalInform}
          onChange={(e) => setMedicalInform(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-32"
          placeholder="Detalles del diagnóstico, observaciones, etc."
          required
        ></textarea>
      </div>

      <div className="mb-4">
        <label htmlFor="treatment" className="block text-gray-700 text-sm font-bold mb-2">
          Tratamiento:
        </label>
        <textarea
          id="treatment"
          value={treatment}
          onChange={(e) => setTreatment(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-24"
          placeholder="Tratamiento prescrito"
        ></textarea>
      </div>

      <div className="mb-6">
        <label htmlFor="recipe" className="block text-gray-700 text-sm font-bold mb-2">
          Receta:
        </label>
        <textarea
          id="recipe"
          value={recipe}
          onChange={(e) => setRecipe(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-24"
          placeholder="Medicamentos y dosis"
        ></textarea>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="submit"
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Guardar Historial
        </button>
      </div>
    </form>
  );
};

export default CreateMedicalHistoryForm;
