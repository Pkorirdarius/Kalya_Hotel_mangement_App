/** Human-readable, status-aware API error handling for UI surfaces. */

import { ApiError } from '../api/client';

const FALLBACK = 'We could not complete that request. Please try again.';

export function errorMessage(error: unknown, fallback: string = FALLBACK): string {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.code === 'network_error') {
      return 'We could not reach the hotel server. Check your connection and try again.';
    }
    if (error.status === 401) {
      return 'Your session has ended. Please sign in again.';
    }
    if (error.status === 403) {
      return 'You do not have permission to do that.';
    }
    if (error.status === 404) {
      return 'We could not find that. It may have been removed.';
    }
    if (error.status === 409) {
      return 'That slot was just taken. Refresh and choose another option.';
    }
    if (error.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (error.status === 400 || error.status === 422) {
      return firstFieldMessage(error) ?? error.message ?? fallback;
    }
    if (error.status >= 500) {
      return 'Something went wrong on our side. Please try again shortly.';
    }
    return error.message || fallback;
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'The request was cancelled.';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export function firstFieldMessage(error: unknown): string | null {
  if (!(error instanceof ApiError) || !error.fields) return null;
  for (const messages of Object.values(error.fields)) {
    if (messages.length > 0) return messages[0];
  }
  return null;
}

export function fieldErrors(error: unknown): Record<string, string[]> {
  return error instanceof ApiError && error.fields ? error.fields : {};
}

export function isConflict(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}

export function isRateLimited(error: unknown): boolean {
  return error instanceof ApiError && error.status === 429;
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 0 || error.code === 'network_error');
}
