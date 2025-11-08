const normalizeUrl = (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Ensure it looks like an absolute URL before returning.
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed.replace(/\/+$/, '');
};

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
  const isProd = (process.env.NODE_ENV ?? '').toLowerCase() === 'prod';
  const renderExternalUrl = normalizeUrl(process.env.RENDER_EXTERNAL_URL);
  const explicitRenderUrl = normalizeUrl(process.env.RENDER_PUBLIC_URL);
  const defaultRenderUrl = 'https://digiclin-system-v2.onrender.com';

  const candidates = [
    normalizeUrl(process.env.FRONTEND_BASE_URL),
    normalizeUrl(process.env.FRONTEND_URL),
    normalizeUrl(process.env.PUBLIC_FRONTEND_URL),
    resolveFromCorsOrigin(),
    renderExternalUrl,
    explicitRenderUrl,
  ];

  for (const candidate of candidates) {
    if (candidate) return candidate;
  }

  if (isProd) {
    return defaultRenderUrl;
  }

  return 'http://localhost:4321';
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
