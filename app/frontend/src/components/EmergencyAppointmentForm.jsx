import React, { useState } from 'react';
import ky from 'ky';

const EmergencyAppointmentForm = () => {
  const [form, setForm] = useState({
    emergency_type: '',
    name: '',
    phone: '',
    description: '',
    datetime: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await ky.post('/api/appointments/emergency', {
        json: form
      });
      setSuccess(true);
      setForm({ emergency_type: '', name: '', phone: '', description: '', datetime: '' });
    } catch (err) {
      setError('No se pudo agendar la emergencia. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-4 bg-green-100 text-green-800 rounded">¡Emergencia agendada correctamente! El personal médico ha sido notificado.</div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Agendar emergencia</h2>
      <label className="block mb-2">Tipo de emergencia *</label>
      <select name="emergency_type" value={form.emergency_type} onChange={handleChange} required className="mb-4 w-full p-2 border rounded">
        <option value="">Selecciona...</option>
        <option value="accidente">Accidente</option>
        <option value="fractura">Fractura</option>
        <option value="golpe">Golpe grave</option>
        <option value="otro">Otro</option>
      </select>
      <label className="block mb-2">Nombre (opcional)</label>
      <input name="name" value={form.name} onChange={handleChange} className="mb-4 w-full p-2 border rounded" />
      <label className="block mb-2">Teléfono (opcional)</label>
      <input name="phone" value={form.phone} onChange={handleChange} className="mb-4 w-full p-2 border rounded" />
      <label className="block mb-2">Descripción (opcional)</label>
      <textarea name="description" value={form.description} onChange={handleChange} className="mb-4 w-full p-2 border rounded" />
      <label className="block mb-2">Fecha y hora sugerida *</label>
      <input type="datetime-local" name="datetime" value={form.datetime} onChange={handleChange} required className="mb-4 w-full p-2 border rounded" />
      {error && <div className="mb-2 text-red-600">{error}</div>}
      <button type="submit" disabled={loading} className="bg-red-600 text-white px-4 py-2 rounded w-full">
        {loading ? 'Agendando...' : 'Agendar emergencia'}
      </button>
    </form>
  );
};

export default EmergencyAppointmentForm;