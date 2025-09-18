import { CalendarDaysIcon } from '@heroicons/react/24/outline';

export default function AppointmentsComponent() {
  // En un futuro, aquí iría la lógica para obtener las citas de la API
  // y pasarlas a un componente de calendario como FullCalendar.
  // const [appointments, setAppointments] = useState([]);

  return (
      <div className="p-10 bg-gray-100 border rounded-lg text-center text-gray-500">
        <p>Próximamente: Aquí se integrará un calendario interactivo (ej. FullCalendar) para visualizar y gestionar las citas.</p>
      </div>
  );
}