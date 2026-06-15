import { createClient } from '../supabase/client';
import { ApiErrorCode, type ApiErrorBody } from '@repo/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function getAccessToken(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) {
    throw new ApiError(ApiErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  return data.session.access_token;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
    throw new ApiError(
      body.code ?? ApiErrorCode.PROVIDER_ERROR,
      body.message ?? res.statusText,
      body.details,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
