const RAW_API_BASE = import.meta.env.VITE_API_URL || '';

/** Must be an absolute URL (scheme + host). Otherwise fetch treats it as a path on the dev server origin. */
function normalizeApiBase(raw) {
  const trimmed = String(raw).trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('//')) {
    if (
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      /^http:\/\//i.test(trimmed) &&
      !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(trimmed)
    ) {
      return trimmed.replace(/^http:\/\//i, 'https://');
    }

    return trimmed;
  }

  if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(trimmed)) {
    return `http://${trimmed}`;
  }

  return `https://${trimmed}`;
}

const API_BASE = normalizeApiBase(RAW_API_BASE);

function buildApiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE) return normalizedPath;

  const trimmedBase = API_BASE.replace(/\/+$/, '');
  const baseHasApiSuffix = /\/api$/i.test(trimmedBase);
  const pathWithoutApiPrefix = normalizedPath.replace(/^\/api(?=\/|$)/i, '');
  const effectivePath = baseHasApiSuffix ? pathWithoutApiPrefix : normalizedPath;

  return `${trimmedBase}${effectivePath}`;
}

function getToken() {
  return typeof window !== 'undefined' ? window.localStorage.getItem('auth_token') : null;
}

export async function apiRequest(path, options = {}) {
  const token = getToken();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };
  const res = await fetch(buildApiUrl(path), { ...options, headers });
  if (!res.ok) {
    const err = new Error(res.statusText);
    err.status = res.status;
    err.body = await res.json().catch(() => ({}));
    throw err;
  }
  return res.json();
}

export function setApiToken(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem('auth_token', token);
  } else {
    window.localStorage.removeItem('auth_token');
  }
}
