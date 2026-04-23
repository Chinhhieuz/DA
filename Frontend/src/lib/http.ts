import {
  type ApiFailure,
  type ApiResponse,
  getApiErrorMessage,
  isApiSuccess
} from '@/types/api';

export class ApiRequestError extends Error {
  statusCode: number;
  payload: ApiFailure | null;

  constructor(message: string, options: { statusCode?: number; payload?: ApiFailure | null } = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.statusCode = options.statusCode ?? 0;
    this.payload = options.payload ?? null;
  }
}

const buildDefaultHeaders = (initHeaders?: HeadersInit): Headers => {
  const headers = new Headers(initHeaders);
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
};

export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: buildDefaultHeaders(init.headers)
  });
}

export async function apiRequest<TData>(url: string, init: RequestInit = {}): Promise<ApiResponse<TData>> {
  const response = await apiFetch(url, init);
  const payload = (await response.json()) as ApiResponse<TData>;
  return payload;
}

export async function apiRequestOrThrow<TData>(url: string, init: RequestInit = {}): Promise<TData> {
  const response = await apiFetch(url, init);
  const payload = (await response.json()) as ApiResponse<TData>;

  if (!response.ok || !isApiSuccess(payload)) {
    throw new ApiRequestError(
      getApiErrorMessage(payload, `Request failed (${response.status || 'network'})`),
      {
        statusCode: response.status,
        payload: (payload && typeof payload === 'object') ? (payload as ApiFailure) : null
      }
    );
  }

  return payload.data;
}
