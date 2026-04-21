import type { ApiResponse } from '@/types/api';

const buildDefaultHeaders = (initHeaders?: HeadersInit): Headers => {
  const headers = new Headers(initHeaders);
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
};

export async function apiRequest<TData>(url: string, init: RequestInit = {}): Promise<ApiResponse<TData>> {
  const response = await fetch(url, {
    ...init,
    headers: buildDefaultHeaders(init.headers)
  });
  const payload = (await response.json()) as ApiResponse<TData>;
  return payload;
}
