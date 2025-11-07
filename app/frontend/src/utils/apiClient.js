import ky from 'ky';
import { BACK_ENDPOINT } from '../config/endpoint.js';

const trimTrailingSlash = (value) => value.replace(/\/+$/, '');
const baseEndpoint = BACK_ENDPOINT ? trimTrailingSlash(BACK_ENDPOINT) : '';

const sanitizePayload = (payload, depth = 0) => {
  if (payload === null || payload === undefined) return payload;
  if (typeof payload !== 'object') return payload;

  if (depth > 2) return '[truncated]';

  if (Array.isArray(payload)) {
    return payload.slice(0, 5).map((item) => sanitizePayload(item, depth + 1));
  }

  return Object.entries(payload).reduce((acc, [key, value]) => {
    const normalizedKey = key.toLowerCase();
    if (/(password|token|secret|authorization)/.test(normalizedKey)) {
      acc[key] = '[redacted]';
    } else {
      acc[key] = sanitizePayload(value, depth + 1);
    }
    return acc;
  }, {});
};

const client = ky.create({
  credentials: 'include',
  timeout: 15000,
  hooks: {
    beforeRequest: [
      (request, options) => {
        const requestSummary = {
          method: request.method,
          url: request.url,
        };
        if (options.json !== undefined) {
          requestSummary.body = sanitizePayload(options.json);
        }
        console.info('[API REQUEST]', requestSummary);
      },
    ],
    afterResponse: [
      async (request, options, response) => {
        if (response.ok) return response;

        let parsedBody;
        let rawText;
        try {
          parsedBody = await response.clone().json();
        } catch (jsonError) {
          try {
            rawText = await response.clone().text();
          } catch (textError) {
            rawText = '[unable to read body]';
          }
        }

        const requestBody = options.json ?? options.body ?? undefined;
        const errorLog = {
          method: request.method,
          url: response.url,
          status: response.status,
          statusText: response.statusText,
          requestBody: requestBody ? sanitizePayload(requestBody) : undefined,
          responseBody:
            parsedBody !== undefined ? sanitizePayload(parsedBody) : rawText ?? undefined,
        };

        console.error('[API ERROR]', errorLog);

        const messageSource =
          typeof parsedBody === 'object' && parsedBody !== null
            ? parsedBody.error ?? parsedBody.message
            : undefined;
        const fallbackMessage = response.statusText || 'Error en la petición.';
        const finalMessage = messageSource || fallbackMessage;

        const error = new Error(finalMessage);
        error.response = response;
        error.data = parsedBody ?? rawText;
        error.context = errorLog;
        throw error;
      },
    ],
  },
});

const resolveUrl = (path) => {
  if (!path) return baseEndpoint;
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return baseEndpoint ? `${baseEndpoint}${normalizedPath}` : normalizedPath;
};

const apiClient = {
  get: (path, options = {}) => client.get(resolveUrl(path), options),
  post: (path, options = {}) => client.post(resolveUrl(path), options),
  put: (path, options = {}) => client.put(resolveUrl(path), options),
  patch: (path, options = {}) => client.patch(resolveUrl(path), options),
  delete: (path, options = {}) => client.delete(resolveUrl(path), options),
  request: (path, options = {}) => client(resolveUrl(path), options),
};

export default apiClient;
