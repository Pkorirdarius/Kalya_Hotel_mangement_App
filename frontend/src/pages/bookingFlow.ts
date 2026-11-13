import type { Payment } from '../lib/api/types';

export type BookingPaymentMethod = 'mpesa' | 'card' | 'bank';

export interface QuoteInput {
  room: string;
  meal: string;
  checkin: string;
  checkout: string;
  guests: number;
}

/** The public UI says "bank"; the payments API expects "bank_transfer". */
export function backendPaymentMethod(
  method: BookingPaymentMethod,
): 'mpesa' | 'card' | 'bank_transfer' {
  return method === 'bank' ? 'bank_transfer' : method;
}

/** Identity of a quote request, so stale server prices are never shown. */
export function quoteKeyFor(input: QuoteInput): string {
  return [input.room, input.meal, input.checkin, input.checkout, input.guests].join('|');
}

/**
 * Whole seconds left before a hold expires. Returns 0 for a missing or invalid
 * timestamp, and never a negative number so countdowns stop at 00:00.
 */
export function secondsRemaining(
  expiresAt: string | null | undefined,
  nowMs: number = Date.now(),
): number {
  if (!expiresAt) return 0;
  const expiry = Date.parse(expiresAt);
  if (Number.isNaN(expiry)) return 0;
  return Math.max(0, Math.ceil((expiry - nowMs) / 1000));
}

/** Render seconds as MM:SS, or H:MM:SS when the hold crosses an hour. */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (value: number) => value.toString().padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

export function isHoldExpired(
  expiresAt: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  return Boolean(expiresAt) && secondsRemaining(expiresAt, nowMs) <= 0;
}

export function isPaymentPending(status: Payment['status'] | undefined): boolean {
  return status === 'initiated' || status === 'pending';
}

export function isPaymentSucceeded(status: Payment['status'] | undefined): boolean {
  return status === 'succeeded';
}

export function isPaymentFailed(status: Payment['status'] | undefined): boolean {
  return status === 'failed' || status === 'cancelled';
}
