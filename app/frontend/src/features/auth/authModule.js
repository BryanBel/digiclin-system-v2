import { atom } from "nanostores";
import apiClient from "../../utils/apiClient.js";

export const user = atom(null);

const login = async ({email, password}) => {
  const response = await apiClient.post('/api/auth/login', {
    json: {email, password}
  });
  const userData = await response.json();
  user.set(userData);
}

const register = async ({ email, password, fullName, role, patientProfile }) => {
  const payload = { email, password, fullName, role };
  if (patientProfile && Object.keys(patientProfile).length > 0) {
    payload.patientProfile = patientProfile;
  }

  const response = await apiClient.post('/api/auth/register', {
    json: payload
  });
  // Cuando se registra el backend envia un mensaje
  return await response.json();
}

const getLoggedUser = async () => {
  const data = await apiClient.get('/api/auth/user').json();
  user.set(data);  
  return data;
}

const logoutUser = async () => {
  await apiClient.get('/api/auth/logout');
}

const AuthModule = { login, register, getLoggedUser, logoutUser };
export default AuthModule;