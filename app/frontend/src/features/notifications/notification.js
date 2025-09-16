/**
 * Crea una notificacion
 * @param {object} options Las opciones para la notificacion
 * @param {string} options.title El titulo de la notificacion
 * @param {string} options.description La descripcion de la noticacion
 * @param {'success' | 'error' } options.type El tipo de notificacion
*/
export const createNotification = (options) => {
  const div = document.querySelector('#notification');
  div.children[0].innerHTML = options.title;
  div.children[1].innerHTML = options.description ?? '';
  div.classList.add('block');
  div.classList.remove('hidden');
  
  switch (options.type) {
    case 'success':
      div.classList.add('bg-green-500');
      break;
    case 'error':
      div.classList.add('bg-red-500');
      break;
  }

  setTimeout(() => {
    div.classList.remove('block')
    div.classList.add('hidden');
  }, 3000);
}
