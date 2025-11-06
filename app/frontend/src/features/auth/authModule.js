import ky from "ky";
import { BACK_ENDPOINT } from "../../config/endpoint.js";
import { atom } from "nanostores";

export const user = atom(null);

const login = async ({email, password}) => {
  const response = await ky.post(`${BACK_ENDPOINT}/api/auth/login`, {
    json: {email, password},
    credentials: 'include'
  });
  const userData = await response.json();
  user.set(userData);
}

const register = async ({ email, password, fullName, role }) => {
  const response = await ky.post(`${BACK_ENDPOINT}/api/auth/register`, {
    json: { email, password, fullName, role },
    credentials: 'include'
  });
  // Cuando se registra el backend envia un mensaje
  return await response.json();
}

const getLoggedUser = async () => {
  const data = await ky.get(`${BACK_ENDPOINT}/api/auth/user`, {credentials: 'include'}).json();
  user.set(data);  
  return data;
}

const logoutUser = async () => {
  await ky.get(`${BACK_ENDPOINT}/api/auth/logout`, {credentials: 'include'});
}

const AuthModule = { login, register, getLoggedUser, logoutUser };
export default AuthModule;