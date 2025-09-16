/** 
  * @typedef Link
  * @type {object}
  * @property {'link' | 'button'} type El tipo de link
  * @property {string} text Lo que va dentro del link
  * @property {string | null} path El href del link
  * @property {function | null} handler La funcion del boton
*/

import AuthModule, { user } from "../auth/authModule.js";

/**
 * @param {string} pathname La url actual.
 * @returns {Link[]}
 */
export const getLinks = (pathname) => {
  /** @type {Link[]} */
  let links = [];
  const currentUser = user.get(); // Para comprobar si el usuario inicio sesion

  if (currentUser) {
    // --- Si el usuario inicio sesion, muestra estos enlaces ---
    links.push({ type: 'link', text: 'Pacientes', path: '/patients', handler: null });
    links.push({ type: 'link', text: 'Doctores', path: '/doctors', handler: null });
    links.push({ type: 'link', text: 'Citas', path: '/appointments', handler: null });
    links.push({
      type: 'button', 
      text: 'Cerrar Sesión', 
      path: null,
      handler: async () => {
        await AuthModule.logoutUser();
        window.location.href = '/login';
      }
    });
  } else {
    // --- Si el usuario no inicio sesion, muestra estos otros enlaces ---
    links.push({ type: 'link', text: 'Login', path: '/login', handler: null });
    links.push({ type: 'link', text: 'Registro', path: '/signup', handler: null });
  }

  return links;
};