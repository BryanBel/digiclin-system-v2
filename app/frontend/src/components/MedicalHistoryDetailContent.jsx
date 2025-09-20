import React, { useState, useEffect } from 'react';
import { UserIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import MedicalHistoryModule from '../features/medical_history/medical_history.module';

/**
 * @typedef {object} MedicalHistoryEntry
 * @property {string} id
 * @property {string} medical_inform
 * @property {string} treatment
 * @property {string} recipe
 * @property {string} patient_id
 * @property {string} doctor_id
 * @property {string} created_at
 */

/**
 * @typedef {object} Patient
 * @property {string} id
 * @property {string} name
 */

/**
 * @typedef {object} Attachment
 * @property {string} id
 * @property {string} filename
 * @property {string} filepath
 * @property {string} mimetype
 */

const MedicalHistoryDetailContent = ({ patientId }) => {
  /** @type {MedicalHistoryEntry[]} */
  const [medicalHistory, setMedicalHistory] = useState([]);
  /** @type {string} */
  const [patientName, setPatientName] = useState('Cargando...');
  /** @type {string} */
  const [error, setError] = useState('');

  // State for attachments popover
  const [openPopoverId, setOpenPopoverId] = useState(null);
  const [entryAttachmentsMap, setEntryAttachmentsMap] = useState({});
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState('');

  useEffect(() => {
    const fetchPatientAndHistory = async () => {
      if (!patientId) {
        setError('ID de paciente no proporcionado.');
        return;
      }

      try {
        // Fetch patient details
        const patientResponse = await fetch(`http://localhost:3000/api/patients/${patientId}`, {
          credentials: 'include',
        });
        if (!patientResponse.ok) {
          throw new Error(`HTTP error! status: ${patientResponse.status}`);
        }
        /** @type {Patient} */
        const patientData = await patientResponse.json();
        setPatientName(patientData.name || 'Paciente Desconocido');

        // Fetch medical history
        const historyData = await MedicalHistoryModule.getHistoryByPatientId(patientId);
        setMedicalHistory(historyData);
      } catch (err) {
        console.error('Failed to fetch patient or medical history:', err);
        setError('Error al cargar los datos del paciente o el historial médico.');
      }
    };
    fetchPatientAndHistory();
  }, [patientId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close popover if click is outside of any popover content
      if (openPopoverId && !event.target.closest('.attachments-popover')) {
        setOpenPopoverId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openPopoverId]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Fecha inválida' : date.toLocaleDateString();
  };

  const handleViewAttachments = async (entryId) => {
    if (openPopoverId === entryId) {
      setOpenPopoverId(null); // Close if already open
      return;
    }

    setOpenPopoverId(entryId); // Open this popover
    setLoadingAttachments(true);
    setAttachmentsError('');

    // Fetch attachments only if not already fetched for this entry
    if (!entryAttachmentsMap[entryId]) {
      try {
        const response = await fetch(`http://localhost:3000/api/medical-history/${entryId}/attachments`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch attachments');
        const data = await response.json();
        setEntryAttachmentsMap(prev => ({ ...prev, [entryId]: data }));
      } catch (err) {
        console.error('Error fetching attachments:', err);
        setAttachmentsError('Error al cargar los archivos adjuntos.');
        setEntryAttachmentsMap(prev => ({ ...prev, [entryId]: [] })); // Store empty array on error
      } finally {
        setLoadingAttachments(false);
      }
    } else {
      setLoadingAttachments(false); // Already fetched
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4">
      <h1 className="text-4xl font-extrabold mb-10 flex items-center gap-3 text-purple-900 drop-shadow-lg">
        <UserIcon className="h-14 w-14 text-purple-700" />
        Historial Clínico de {patientName}
      </h1>
      <p className="text-gray-700 mb-8">Detalles del historial médico para {patientName}.</p>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {medicalHistory.length > 0 ? (
        <div className="space-y-4">
          {medicalHistory.map((entry) => (
            <div key={entry.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-center relative"> {/* Added relative */} 
              <a href={`/medical-history/entry/${entry.id}`} className="block flex-grow">
                <p className="text-gray-800 font-semibold">Fecha: {formatDate(entry.entry_date)}</p>
                <p className="text-gray-700"><strong>Información Médica:</strong> {entry.medical_inform}</p>
                {entry.treatment && <p className="text-gray-700"><strong>Tratamiento:</strong> {entry.treatment}</p>}
                {entry.recipe && <p className="text-gray-700"><strong>Receta:</strong> {entry.recipe}</p>}
              </a>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation(); // Prevent event from bubbling to document and closing immediately
                  handleViewAttachments(entry.id);
                }}
                className="ml-4 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-1"
              >
                {loadingAttachments && openPopoverId === entry.id ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                ) : (
                  <PaperClipIcon className="h-4 w-4" />
                )}
                Ver Adjuntos
              </button>

              {openPopoverId === entry.id && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-10 p-3 max-h-60 overflow-y-auto attachments-popover"> {/* Adjusted width and height */} 
                  <h4 className="text-md font-bold mb-2">Adjuntos de esta entrada</h4>
                  {attachmentsError && <p className="text-red-500 text-sm mb-2">{attachmentsError}</p>}
                  {loadingAttachments ? (
                    <p className="text-gray-500 text-sm">Cargando adjuntos...</p>
                  ) : entryAttachmentsMap[entry.id] && entryAttachmentsMap[entry.id].length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {entryAttachmentsMap[entry.id].map((file) => (
                        <li key={file.id} className="py-1 flex items-center gap-1 text-sm">
                          <PaperClipIcon className="h-4 w-4 text-gray-500" />
                          <a
                            href={`http://localhost:3000/uploads/${file.filename}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {file.filename}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">No hay archivos adjuntos para esta entrada.</p>
                  )}
                  <div className="mt-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent closing other popovers
                        setOpenPopoverId(null);
                      }}
                      className="px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600">No hay historial médico para este paciente.</p>
      )}
    </div>
  );
};

export default MedicalHistoryDetailContent;