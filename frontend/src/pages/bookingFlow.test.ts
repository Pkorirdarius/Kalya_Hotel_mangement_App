import { describe, expect, it } from 'vitest';

import {
  backendPaymentMethod,
  formatCountdown,
  isHoldExpired,
  isPaymentFailed,
  isPaymentPending,
  isPaymentSucceeded,
  quoteKeyFor,
  secondsRemaining,
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

  it('calculates the seconds left in a payment hold', () => {
    const now = Date.parse('2026-12-01T10:00:00Z');
    expect(secondsRemaining('2026-12-01T10:15:00Z', now)).toBe(900);
    expect(secondsRemaining('2026-12-01T09:59:59Z', now)).toBe(0);
    expect(secondsRemaining(null, now)).toBe(0);
    expect(secondsRemaining('not-a-date', now)).toBe(0);
  });

  it('formats countdowns for minutes and long holds', () => {
    expect(formatCountdown(900)).toBe('15:00');
    expect(formatCountdown(61)).toBe('01:01');
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(-5)).toBe('00:00');
    expect(formatCountdown(3_725)).toBe('1:02:05');
  });

  it('detects an expired hold', () => {
    const now = Date.parse('2026-12-01T10:00:00Z');
    expect(isHoldExpired('2026-12-01T10:00:00Z', now)).toBe(true);
    expect(isHoldExpired('2026-12-01T10:00:01Z', now)).toBe(false);
    expect(isHoldExpired(null, now)).toBe(false);
  });
});
