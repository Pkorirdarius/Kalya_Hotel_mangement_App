import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiRequest } from './client';

function fakeResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) {
  const normalised = Object.fromEntries(
    Object.entries({ 'content-type': 'application/json', ...headers }).map(
      ([key, value]) => [key.toLowerCase(), value],
    ),
  );
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => normalised[name.toLowerCase()] ?? null },
    json: async () => body,
    text: async () => String(body ?? ''),
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('returns a parsed JSON body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(200, { ok: true })));
    await expect(apiRequest<{ ok: boolean }>('/rooms/')).resolves.toEqual({ ok: true });
  });

  it('returns undefined for 204 responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(204, null)));
    await expect(apiRequest('/rooms/x/')).resolves.toBeUndefined();
  });

  it('normalises the backend error envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        fakeResponse(
          400,
          {
            error: {
              code: 'validation_error',
              message: 'Invalid input.',
              fields: { phone: ['Enter a Kenyan mobile number.'] },
              request_id: 'req-123',
            },
          },
          { 'content-type': 'application/json' },
        ),
      ),
    );

    const error = (await apiRequest('/bookings/').catch((caught: unknown) => caught)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.code).toBe('validation_error');
    expect(error.requestId).toBe('req-123');
    expect(error.fields?.phone).toEqual(['Enter a Kenyan mobile number.']);
  });

  it('captures Retry-After on 429 responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        fakeResponse(429, { detail: 'Slow down' }, { 'retry-after': '7' }),
      ),
    );

    const error = (await apiRequest('/bookings/').catch((caught: unknown) => caught)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(429);
    expect(error.retryAfterSeconds).toBe(7);
  });

  it('turns fetch failures into a network ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const error = (await apiRequest('/rooms/').catch((caught: unknown) => caught)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.code).toBe('network_error');
  });
});
