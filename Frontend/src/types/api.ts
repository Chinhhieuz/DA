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
