import { atom } from "nanostores";
import { createNotification } from "../notifications/notificiation.js";
import { BACK_ENDPOINT } from "../../config/endpoints.js";
import ky from "ky";
const BASE_URL = `${BACK_ENDPOINT}/api/contacts`;


/** 
  * @typedef Contact
  * @type {object}
  * @property {string} id El id del contacto
  * @property {string} name El nombre del contacto
  * @property {string} phone El numero del contacto
*/

/** @type {Contact[]} */
let contactsArray = [];
export const contacts = atom(contactsArray);


/** 
  * Agrega un contacto.
  * @param {object} contactToCreate El nuevo contacto
  * @param {string} contactToCreate.name El nombre del contacto
  * @param {string} contactToCreate.phone El telefono del contacto
*/
const addContact = async (contactToCreate) => {
  try {
    const contactCreated = await ky.post(BASE_URL, {json: contactToCreate, credentials: 'include'}).json();
    contacts.set(contacts.get().concat(contactCreated));
    createNotification({title: 'Contacto creado!',type: 'success'});
  } catch (error) {
    console.log(error);
    const errorData = await error.response.json();
    createNotification({
      title: 'Ups! Hubo un error',
      description: errorData.error,
      type: 'error'
    });
  }
};


/**
  * Elimina un contacto
  * @param {string} id El id del contacto a eliminar
*/
const removeContact = async (id) => {
  const url = `${BASE_URL}/${id}`;
  try {
    const contactDeleted = await ky.delete(url, { credentials: 'include'}).json();
    contacts.set(contacts.get().filter(contact => contact.id !== contactDeleted.id));
    createNotification({
      title: 'Contacto eliminado',
      description: `${contactDeleted.name}`,
      type: 'success'
    });
  } catch (error) {
    console.log(error);
    const errorData = await error.response.json();
    createNotification({
      title: 'Ups! Hubo un error',
      description: errorData.error,
      type: 'error'
    });
  }
}

/**
 * Actualiza un contacto
 * @param {Contact} contactToUpdate
*/
const updateContact = async (contactToUpdate) => {
  const url = `${BASE_URL}/${contactToUpdate.id}`;
  try {
    const contactUpdated = await ky.put(url, {json: contactToUpdate, credentials: 'include'}).json();
    contacts.set(contacts.get().map(contact => {
      if (contact.id === contactUpdated.id) {
        return contactUpdated;
      } else {
        return contact;
      }
    }));
     createNotification({
      title: 'Contacto actualizado',
      description: `${contactUpdated.name}`,
      type: 'success'
    });
  } catch (error) {
    console.log(error);
    const errorData = await error.response.json();
    createNotification({
      title: 'Ups! Hubo un error',
      description: errorData.error,
      type: 'error'
    });
  }
}

const getContacts = async () => {
  try {
    const contactsData = await ky.get(`${BACK_ENDPOINT}/api/contacts`, {
      credentials: 'include'
    }).json()
    contacts.set(contactsData);
  } catch (error) {
    if (error.response.status === 401 || error.response.status === 403) {
      location.replace('/login');
    }
    console.log(error);
  }
}

export default {
  addContact,
  removeContact,
  updateContact,
  getContacts
}