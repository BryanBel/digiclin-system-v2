import React from 'react';
import { CalendarIcon } from '@heroicons/react/24/outline';

const AppointmentsComponent = () => (
  <div className="bg-white dark:bg-zoom-dark rounded-lg shadow-lg border border-zoom-gray p-8 max-w-2xl mx-auto mt-8">
    <div className="flex items-center gap-4 mb-6">
      <CalendarIcon className="w-8 h-8 text-zoom-blue dark:text-white" />
      <h2 className="text-2xl font-bold text-zoom-blue dark:text-white">Tus citas médicas</h2>
    </div>
    {/* Aquí va la lista de citas o el formulario */}
    {/* Ejemplo de botón HeroUI */}
    {/* <Button color="primary">Agendar nueva cita</Button> */}
    <div className="mt-4">
      <p className="text-zoom-dark dark:text-zoom-gray">No tienes citas agendadas actualmente.</p>
      <a href="/appointments" className="mt-4 inline-block bg-zoom-blue text-white px-6 py-2 rounded-lg shadow hover:bg-zoom-dark font-semibold transition">Agendar nueva cita</a>
    </div>
  </div>
);

export default AppointmentsComponent;