import { describe, expect, it } from 'vitest';

import {
  backendPaymentMethod,
  isPaymentFailed,
  isPaymentPending,
  isPaymentSucceeded,
  quoteKeyFor,
} from './bookingFlow';

describe('bookingFlow helpers', () => {
  it('maps the public bank label to the API value', () => {
    expect(backendPaymentMethod('bank')).toBe('bank_transfer');
    expect(backendPaymentMethod('mpesa')).toBe('mpesa');
    expect(backendPaymentMethod('card')).toBe('card');
  });

  it('builds a stable key for every quote input', () => {
    const input = {
      room: 'standard-executive',
      meal: 'breakfast',
      checkin: '2026-12-01',
      checkout: '2026-12-03',
      guests: 2,
    };
    expect(quoteKeyFor(input)).toBe('standard-executive|breakfast|2026-12-01|2026-12-03|2');
    expect(quoteKeyFor(input)).toBe(quoteKeyFor({ ...input }));
    expect(quoteKeyFor({ ...input, guests: 3 })).not.toBe(quoteKeyFor(input));
  });

  it('classifies pending payment statuses', () => {
    expect(isPaymentPending('initiated')).toBe(true);
    expect(isPaymentPending('pending')).toBe(true);
    expect(isPaymentPending('succeeded')).toBe(false);
    expect(isPaymentPending(undefined)).toBe(false);
  });

  it('classifies successful payment statuses', () => {
    expect(isPaymentSucceeded('succeeded')).toBe(true);
    expect(isPaymentSucceeded('pending')).toBe(false);
    expect(isPaymentSucceeded(undefined)).toBe(false);
  });

  it('classifies failed and cancelled payment statuses', () => {
    expect(isPaymentFailed('failed')).toBe(true);
    expect(isPaymentFailed('cancelled')).toBe(true);
    expect(isPaymentFailed('refunded')).toBe(false);
    expect(isPaymentFailed('succeeded')).toBe(false);
  });
});
