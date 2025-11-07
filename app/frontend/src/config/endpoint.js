const DEFAULT_DEV_ENDPOINT = 'http://localhost:3000';

export const BACK_ENDPOINT =
	import.meta.env.BACKEND_URL ?? (import.meta.env.DEV ? DEFAULT_DEV_ENDPOINT : '');
