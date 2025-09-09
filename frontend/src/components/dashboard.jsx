import { Button, Card } from '@heroui/react';
import { ChartBarIcon, UserGroupIcon, CalendarDaysIcon, UserIcon } from '@heroicons/react/24/outline';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-blue-300 to-blue-500">
      <div className="max-w-7xl mx-auto py-10 px-4">
        <h1 className="text-4xl font-extrabold mb-10 flex items-center gap-3 text-blue-900 drop-shadow-lg">
          <ChartBarIcon className="h-12 w-12 text-blue-700" />
          Panel de la Clínica
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <Card className="shadow-xl bg-white/80 border-t-4 border-blue-400">
            <div className="flex items-center gap-4 mb-3">
              <UserGroupIcon className="h-10 w-10 text-blue-500" />
              <h2 className="text-2xl font-semibold text-blue-700">Pacientes</h2>
            </div>
            <p className="text-gray-700 mb-6">Gestión y registro de pacientes.</p>
            <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">Ver pacientes</Button>
          </Card>
          <Card className="shadow-xl bg-white/80 border-t-4 border-green-400">
            <div className="flex items-center gap-4 mb-3">
              <CalendarDaysIcon className="h-10 w-10 text-green-500" />
              <h2 className="text-2xl font-semibold text-green-700">Citas</h2>
            </div>
            <p className="text-gray-700 mb-6">Control de citas médicas.</p>
            <Button className="w-full bg-green-500 hover:bg-green-600 text-white">Ver citas</Button>
          </Card>
          <Card className="shadow-xl bg-white/80 border-t-4 border-purple-400">
            <div className="flex items-center gap-4 mb-3">
              <UserIcon className="h-10 w-10 text-purple-500" />
              <h2 className="text-2xl font-semibold text-purple-700">Doctores</h2>
            </div>
            <p className="text-gray-700 mb-6">Administración de personal médico.</p>
            <Button className="w-full bg-purple-500 hover:bg-purple-600 text-white">Ver doctores</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}