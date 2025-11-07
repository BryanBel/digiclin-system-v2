const DEFAULT_DEV_ENDPOINT = 'http://localhost:3000';
const envDev = import.meta.env.DEV;
const isDev = envDev === true || envDev === 'true' || import.meta.env.MODE === 'development';

export const BACK_ENDPOINT =
	(import.meta.env.PUBLIC_BACKEND_URL ?? '').trim() || (isDev ? DEFAULT_DEV_ENDPOINT : '');
