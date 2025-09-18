/**
 * Crea una notificacion
 * @param {object} options Las opciones para la notificacion
 * @param {string} options.title El titulo de la notificacion
 * @param {string} options.description La descripcion de la noticacion
 * @param {'success' | 'error' } options.type El tipo de notificacion
*/
export const createNotification = (options) => {
  const container = document.querySelector('#notification-container');
  if (!container) {
    console.error('Notification container not found!');
    return;
  }

  const notificationDiv = document.createElement('div');
  notificationDiv.className = 'p-4 rounded-md shadow-lg text-white transition-all duration-300 transform translate-x-full';

  const titleEl = document.createElement('h4');
  titleEl.className = 'font-bold';
  titleEl.textContent = options.title;
  notificationDiv.appendChild(titleEl);

  if (options.description) {
    const descEl = document.createElement('p');
    descEl.textContent = options.description;
    notificationDiv.appendChild(descEl);
  }

  switch (options.type) {
    case 'success':
      notificationDiv.classList.add('bg-green-500');
      break;
    case 'error':
      notificationDiv.classList.add('bg-red-500');
      break;
  }

  container.appendChild(notificationDiv);

  // Animate in
  setTimeout(() => notificationDiv.classList.remove('translate-x-full'), 10);

  // Animate out and remove
  setTimeout(() => {
    notificationDiv.classList.add('translate-x-full', 'opacity-0');
    notificationDiv.addEventListener('transitionend', () => notificationDiv.remove());
  }, 3000);
};
