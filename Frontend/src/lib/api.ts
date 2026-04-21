const normalizeBaseUrl = (rawUrl: string | undefined) => {
  return String(rawUrl || '').trim().replace(/\/+$/, '');
};

const resolveApiBaseUrl = () => {
  const envBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL);
  if (envBaseUrl) return envBaseUrl;

  if (typeof window !== 'undefined') {
    const hostname = String(window.location.hostname || '').toLowerCase();
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

    if (isLocal) return 'http://localhost:5000';

    // Production fallback when VITE_API_URL is missing:
    // prefer same-origin API gateway/reverse-proxy.
    return normalizeBaseUrl(window.location.origin);
  }

  return 'http://localhost:5000';
};

export const API_BASE_URL = resolveApiBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;
