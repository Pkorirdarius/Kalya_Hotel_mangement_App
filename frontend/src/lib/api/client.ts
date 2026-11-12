/**
 * Thin typed fetch wrapper around the hotel REST API.
 *
 * - Reads the base URL from `VITE_API_URL` (defaults to `/api/v1`).
 * - Sends the Django CSRF cookie as `X-CSRFToken` on unsafe requests.
 * - Normalises the backend error envelope into a single `ApiError`.
 */

export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/$/, '');

export interface ApiErrorBody {
  code: string;
  message: string;
  fields: Record<string, string[]> | null;
  request_id: string | null;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string[]> | null;
  readonly requestId: string | null;
  /** Seconds the server asked us to wait (HTTP 429 Retry-After). */
  readonly retryAfterSeconds: number | null;

  constructor(status: number, body: ApiErrorBody, retryAfterSeconds: number | null = null) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.fields = body.fields;
    this.requestId = body.request_id;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, QueryValue>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function csrfToken(): Promise<string | null> {
  const existing = readCookie('csrftoken');
  if (existing) return existing;
  try {
    await fetch(`${API_BASE_URL}/auth/csrf/`, { credentials: 'include' });
    return readCookie('csrftoken');
  } catch {
    return null;
  }
}

function buildUrl(path: string, params?: Record<string, QueryValue>): string {
  const base = path.startsWith('http')
    ? path
    : `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  if (!params) return base;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  if (!query) return base;
  return `${base}${base.includes('?') ? '&' : '?'}${query}`;
}

function retryAfterSeconds(headers: Headers): number | null {
  const raw = headers.get('retry-after');
  if (!raw) return null;
  const seconds = Number.parseInt(raw, 10);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

function normaliseError(
  status: number,
  payload: unknown,
  retryAfter: number | null = null,
): ApiError {
  const fallback: ApiErrorBody = {
    code: status === 404 ? 'not_found' : 'request_failed',
    message:
      status >= 500
        ? 'Something went wrong on our side. Please try again.'
        : 'We could not complete that request.',
    fields: null,
    request_id: null,
  };

  if (payload && typeof payload === 'object') {
    const envelope = payload as { error?: Partial<ApiErrorBody> };
    if (envelope.error) {
      return new ApiError(
        status,
        {
          ...fallback,
          ...envelope.error,
          fields: (envelope.error.fields as Record<string, string[]> | null) ?? null,
        },
        retryAfter,
      );
    }
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === 'string') {
      return new ApiError(status, { ...fallback, message: detail }, retryAfter);
    }
    const plain: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (Array.isArray(value)) plain[key] = value.map(String);
      else if (typeof value === 'string') plain[key] = [value];
    }
    if (Object.keys(plain).length > 0) {
      return new ApiError(
        status,
        { ...fallback, code: 'validation_error', fields: plain },
        retryAfter,
      );
    }
  }

  return new ApiError(status, fallback, retryAfter);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = await csrfToken();
    if (token) headers['X-CSRFToken'] = token;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.params), {
      method,
      headers,
      credentials: 'include',
      signal: options.signal,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(0, {
      code: 'network_error',
      message: 'We could not reach the hotel server. Check your connection and try again.',
      fields: null,
      request_id: null,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    throw normaliseError(response.status, payload, retryAfterSeconds(response.headers));
  }

  return payload as T;
}
