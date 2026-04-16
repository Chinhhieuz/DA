const normalizeBaseUrl = (rawUrl: string | undefined) => {
  return String(rawUrl || '').trim().replace(/\/+$/, '');
};

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL || 'http://localhost:5000');
export const API_URL = `${API_BASE_URL}/api`;
