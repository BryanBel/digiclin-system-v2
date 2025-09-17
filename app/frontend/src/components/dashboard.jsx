import { ChartBarIcon, UserGroupIcon, CalendarDaysIcon, UserIcon } from '@heroicons/react/24/outline';
import DashboardCard from './DashboardCard';

export default function Dashboard() {
  const cardData = [
    {
      icon: UserGroupIcon,
      title: 'Pacientes',
      description: 'Gestión y registro de pacientes.',
      buttonText: 'Ver pacientes',
      themeColor: 'blue',
      path: '/patients',
    },
    {
      icon: CalendarDaysIcon,
      title: 'Citas',
      description: 'Control de citas médicas.',
      buttonText: 'Ver citas',
      themeColor: 'green',
      path: '/appointments',
    },
    {
      icon: UserIcon,
      title: 'Doctores',
      description: 'Administración de personal médico.',
      buttonText: 'Ver doctores',
      themeColor: 'purple',
      path: '/doctors',
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-blue-100 via-blue-300 to-blue-500 p-4">
      <div className="max-w-7xl mx-auto py-10 px-4">
        <h1 className="text-4xl font-extrabold mb-10 flex items-center gap-3 text-blue-900 drop-shadow-lg">
          <ChartBarIcon className="h-12 w-12 text-blue-700" />
          Panel de la Clínica
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {cardData.map((card) => (
            <DashboardCard
              key={card.title}
              {...card}
              onButtonClick={() => (window.location.href = card.path)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}