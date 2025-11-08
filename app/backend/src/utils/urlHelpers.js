const normalizeUrl = (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Ensure it looks like an absolute URL before returning.
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed.replace(/\/+$/, '');
};

const isLocalCandidate = (candidate) =>
  typeof candidate === 'string' && /localhost|127\.0\.0\.1|::1/.test(candidate);

const DEFAULT_RENDER_URL = 'https://digiclin-system-v2.onrender.com';

const resolveFromCorsOrigin = () => {
  const corsOrigin = process.env.CORS_ORIGIN;
  if (!corsOrigin) return null;
  const [firstOrigin] = corsOrigin
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return normalizeUrl(firstOrigin);
};

export const resolveFrontendBaseUrl = () => {
  const candidates = [
    process.env.RENDER_PUBLIC_URL,
    process.env.RENDER_EXTERNAL_URL,
    process.env.FRONTEND_BASE_URL,
    process.env.FRONTEND_URL,
    process.env.PUBLIC_FRONTEND_URL,
    resolveFromCorsOrigin(),
  ];

  for (const rawCandidate of candidates) {
    const candidate = normalizeUrl(rawCandidate);
    if (!candidate || isLocalCandidate(candidate)) continue;
    return candidate;
  }

  return DEFAULT_RENDER_URL;
};

export const buildFrontendUrl = (path, params = new URLSearchParams()) => {
  const baseUrl = resolveFrontendBaseUrl();
  const url = new URL(path ?? '/', `${baseUrl}/`);

  if (params instanceof URLSearchParams) {
    params.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
  } else if (params && typeof params === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
};

export const resolveBackendBaseUrl = () => {
  const candidates = [
    process.env.BACKEND_BASE_URL,
    process.env.BACKEND_URL,
    process.env.API_BASE_URL,
    process.env.RENDER_BACKEND_URL,
    process.env.RENDER_EXTERNAL_URL,
  ];

  for (const rawCandidate of candidates) {
    const candidate = normalizeUrl(rawCandidate);
    if (!candidate || isLocalCandidate(candidate)) continue;
    return candidate;
  }

  return DEFAULT_RENDER_URL;
};

export const buildBackendUrl = (path, params = new URLSearchParams()) => {
  const baseUrl = resolveBackendBaseUrl();
  const url = new URL(path ?? '/', `${baseUrl}/`);

  if (params instanceof URLSearchParams) {
    params.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
  } else if (params && typeof params === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
};
