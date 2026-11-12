import { describe, expect, it } from 'vitest';

import { ApiError } from '../api/client';
import {
  errorMessage,
  fieldErrors,
  firstFieldMessage,
  isConflict,
  isNetworkError,
  isRateLimited,
} from './errors';

function apiError(
  status: number,
  options: {
    message?: string;
    fields?: Record<string, string[]> | null;
    code?: string;
  } = {},
) {
  return new ApiError(status, {
    code: options.code ?? 'test',
    message: options.message ?? 'Server message',
    fields: options.fields ?? null,
    request_id: 'req-1',
  });
}

describe('errorMessage', () => {
  it('explains network failures', () => {
    expect(errorMessage(apiError(0, { code: 'network_error' }))).toMatch(/could not reach/i);
  });

  it('explains conflicts without leaking server wording', () => {
    expect(errorMessage(apiError(409))).toMatch(/just taken/i);
  });

  it('explains rate limiting', () => {
    expect(errorMessage(apiError(429))).toMatch(/too many requests/i);
  });

  it('uses the first field error for validation failures', () => {
    const error = apiError(400, {
      message: 'Invalid input.',
      fields: { phone: ['Enter a Kenyan mobile number.'] },
    });
    expect(errorMessage(error)).toBe('Enter a Kenyan mobile number.');
    expect(firstFieldMessage(error)).toBe('Enter a Kenyan mobile number.');
    expect(fieldErrors(error).phone).toEqual(['Enter a Kenyan mobile number.']);
  });

  it('falls back for unknown values', () => {
    expect(errorMessage('boom', 'Custom fallback')).toBe('Custom fallback');
  });
});

describe('error predicates', () => {
  it('classifies conflicts, rate limits and network errors', () => {
    expect(isConflict(apiError(409))).toBe(true);
    expect(isRateLimited(apiError(429))).toBe(true);
    expect(isNetworkError(apiError(0))).toBe(true);
    expect(isConflict(apiError(400))).toBe(false);
  });
});
