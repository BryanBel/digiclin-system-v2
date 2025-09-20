import React, { useState, useEffect } from 'react';
import { UserIcon, PaperClipIcon, ArrowUpTrayIcon, TrashIcon } from '@heroicons/react/24/outline';

const MedicalHistoryEntryDetailContent = ({ entryId }) => {
  const [entry, setEntry] = useState(null);
  const [patientName, setPatientName] = useState('Cargando...');
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchEntryDetails = async () => {
    if (!entryId) {
      setError('ID de entrada no proporcionado.');
      return;
    }
    try {
      const response = await fetch(`http://localhost:3000/api/medical-history/${entryId}`, { credentials: 'include' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const entryData = await response.json();
      setEntry(entryData);

      if (entryData && entryData.patient_id) {
        const patientResponse = await fetch(`http://localhost:3000/api/patients/${entryData.patient_id}`, { credentials: 'include' });
        if (!patientResponse.ok) throw new Error(`HTTP error! status: ${patientResponse.status}`);
        const patientData = await patientResponse.json();
        setPatientName(patientData.name || 'Paciente Desconocido');
      }
    } catch (err) {
      console.error('Failed to fetch medical history entry:', err);
      setError('Error al cargar los detalles de la entrada del historial médico.');
    }
  };

  const fetchAttachments = async () => {
    if (!entryId) return;
    try {
      const response = await fetch(`http://localhost:3000/api/medical-history/${entryId}/attachments`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch attachments');
      const data = await response.json();
      setAttachments(data);
    } catch (err) {
      console.error('Failed to fetch attachments:', err);
    }
  };

  useEffect(() => {
    fetchEntryDetails();
    fetchAttachments();
  }, [entryId]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Fecha inválida' : date.toLocaleDateString();
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile || !entryId) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`http://localhost:3000/api/medical-history/${entryId}/attachments`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      setSelectedFile(null);
      document.getElementById('file-input').value = ''; 
      await fetchAttachments();
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Error al subir el archivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este archivo adjunto?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/medical-history/${entryId}/attachments/${attachmentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      // Refresh attachments list
      await fetchAttachments();
    } catch (err) {
      console.error('Error deleting file:', err);
      setError('Error al eliminar el archivo.');
    }
  };

  if (error) {
    return <div className="max-w-7xl mx-auto py-10 px-4"><p className="text-red-500">{error}</p></div>;
  }

  if (!entry) {
    return <div className="max-w-7xl mx-auto py-10 px-4"><p className="text-gray-600">Cargando detalles...</p></div>;
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4">
      <h1 className="text-4xl font-extrabold mb-10 flex items-center gap-3 text-purple-900 drop-shadow-lg">
        <UserIcon className="h-14 w-14 text-purple-700" />
        Entrada de Historial para {patientName}
      </h1>
      <p className="text-gray-700 mb-8">Detalles de la entrada del historial médico.</p>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-gray-800 font-semibold mb-2"><strong>Fecha:</strong> {formatDate(entry.entry_date)}</p>
        <p className="text-gray-800 mb-2"><strong>Información Médica:</strong> {entry.medical_inform}</p>
        {entry.treatment && <p className="text-gray-800 mb-2"><strong>Tratamiento:</strong> {entry.treatment}</p>}
        {entry.recipe && <p className="text-gray-800 mb-2"><strong>Receta:</strong> {entry.recipe}</p>}
      </div>

      <div className="mt-8 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-purple-800">Archivos Adjuntos</h2>
        <div className="space-y-4">
          {attachments.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {attachments.map(file => (
                <li key={file.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PaperClipIcon className="h-5 w-5 text-gray-500" />
                    <a 
                      href={`http://localhost:3000/uploads/${file.filename}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {file.filename}
                    </a>
                  </div>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                    title="Eliminar archivo"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No hay archivos adjuntos.</p>
          )}
        </div>

        <div className="mt-6">
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <input 
              id="file-input"
              type="file"
              onChange={handleFileChange} 
              className="sr-only"
            />
            <label
              htmlFor="file-input"
              className="cursor-pointer px-4 py-2 bg-purple-100 text-purple-800 rounded-md hover:bg-purple-200 font-semibold transition-colors"
            >
              Seleccionar Archivo
            </label>
            {selectedFile && <span className="text-gray-600">{selectedFile.name}</span>}
            <button 
              onClick={handleUpload} 
              disabled={!selectedFile || uploading}
              className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 flex items-center justify-center gap-2 transition-colors"
            >
              {uploading ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></span>
                  <span>Subiendo...</span>
                </>
              ) : (
                <>
                  <ArrowUpTrayIcon className="h-5 w-5" />
                  <span>Subir</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalHistoryEntryDetailContent;
