/**
 * Central React Query configuration.
 *
 * Retry policy:
 * - 400 / 401 / 403 / 404 / 409 / 422 are caller errors: never retry.
 * - 429 gets one retry, honouring `Retry-After` when the server sends it.
 * - 5xx and network failures get up to two retries with exponential backoff.
 * - Aborted requests are never retried.
 *
 * Mutations are never retried automatically: double-submitting a booking or a
 * payment must be a deliberate user action.
 */

import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';

const MAX_RETRIES = 2;
const MAX_DELAY_MS = 8_000;

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isAbortError(error)) return false;
  if (!(error instanceof ApiError)) {
    // A plain fetch failure (offline, DNS) is retryable.
    return failureCount < MAX_RETRIES;
  }
  if (error.status === 0) return failureCount < MAX_RETRIES;
  if (error.status === 429) return failureCount < 1;
  if (error.status >= 500 && error.status <= 599) {
    return failureCount < MAX_RETRIES;
  }
  return false;
}

export function retryDelay(attempt: number, error: unknown): number {
  if (error instanceof ApiError && error.retryAfterSeconds !== null) {
    return Math.min(error.retryAfterSeconds * 1_000, MAX_DELAY_MS);
  }
  return Math.min(500 * 2 ** attempt, MAX_DELAY_MS);
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        retryDelay,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/** Shared client for code that runs outside the provider (e.g. prefetch). */
export const queryClient = createQueryClient();
