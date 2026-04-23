export interface ApiSuccess<TData> {
  status: 'success';
  data: TData;
  message?: string;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  status: string;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export type ApiResponse<TData> = ApiSuccess<TData> | ApiFailure;

export const isApiSuccess = <TData>(payload: ApiResponse<TData>): payload is ApiSuccess<TData> => {
  return payload.status === 'success';
};

export const getApiErrorMessage = (
  payload: ApiFailure | ApiResponse<unknown> | null | undefined,
  fallback = 'Request failed'
): string => {
  if (!payload || typeof payload !== 'object') return fallback;
  if (typeof payload.message === 'string' && payload.message.trim()) return payload.message;
  if ('error' in payload && typeof payload.error === 'string' && payload.error.trim()) return payload.error;
  return fallback;
};
