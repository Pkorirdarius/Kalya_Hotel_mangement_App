import { describe, expect, it } from 'vitest';

import { ApiError } from '../api/client';
import { retryDelay, shouldRetry } from './queryClient';

function apiError(status: number, retryAfterSeconds: number | null = null) {
  return new ApiError(
    status,
    { code: 'test', message: 'test', fields: null, request_id: null },
    retryAfterSeconds,
  );
}

describe('shouldRetry', () => {
  it('never retries caller errors', () => {
    for (const status of [400, 401, 403, 404, 409, 422]) {
      expect(shouldRetry(0, apiError(status))).toBe(false);
    }
  });

  it('retries 5xx twice', () => {
    expect(shouldRetry(0, apiError(500))).toBe(true);
    expect(shouldRetry(1, apiError(503))).toBe(true);
    expect(shouldRetry(2, apiError(500))).toBe(false);
  });

  it('retries 429 once', () => {
    expect(shouldRetry(0, apiError(429))).toBe(true);
    expect(shouldRetry(1, apiError(429))).toBe(false);
  });

  it('retries network failures twice', () => {
    expect(shouldRetry(0, apiError(0))).toBe(true);
    expect(shouldRetry(1, new TypeError('Failed to fetch'))).toBe(true);
    expect(shouldRetry(2, new TypeError('Failed to fetch'))).toBe(false);
  });

  it('never retries an aborted request', () => {
    expect(shouldRetry(0, new DOMException('aborted', 'AbortError'))).toBe(false);
  });
});

describe('retryDelay', () => {
  it('honours Retry-After when present', () => {
    expect(retryDelay(0, apiError(429, 7))).toBe(7_000);
  });

  it('backs off exponentially and caps the delay', () => {
    expect(retryDelay(0, apiError(500))).toBe(500);
    expect(retryDelay(1, apiError(500))).toBe(1_000);
    expect(retryDelay(4, apiError(500))).toBe(8_000);
  });
});
