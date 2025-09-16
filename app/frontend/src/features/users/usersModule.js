import ky from "ky";
import { createNotification } from "../notifications/notification.js";
import { BACK_ENDPOINT } from "../../config/endpoints.js";

const UsersModule = {
  signup: async ({ email, password }) => {
    try {
      await ky.post(`${BACK_ENDPOINT}/api/users`, { json: { email, password } });
      createNotification({
        title: 'Usuario creado!',
        description: 'Se ha enviado un correo de verificacion a su bandeja de correo',
        type: 'success'
      });
      return { success: true };
    } catch (error) {
      const errorData = await error?.response?.json();
      createNotification({
        title: 'Ups! Hubo un error',
        description: errorData?.error ?? 'Sin mensaje',
        type: 'error'
      });
      return { success: false };
    }
  }
};

export default UsersModule;
