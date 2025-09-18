import { CalendarDaysIcon } from '@heroicons/react/24/outline';

export default function AppointmentsComponent() {
  // En un futuro, aquí iría la lógica para obtener las citas de la API
  // y pasarlas a un componente de calendario como FullCalendar.
  // const [appointments, setAppointments] = useState([]);

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <CalendarDaysIcon className="h-8 w-8" />
          Gestión de Citas
        </h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          + Nueva Cita
        </button>
      </div>
      <div className="p-10 bg-gray-100 border rounded-lg text-center text-gray-500">
        <p>Próximamente: Aquí se integrará un calendario interactivo (ej. FullCalendar) para visualizar y gestionar las citas.</p>
      </div>
    </div>
  );
}