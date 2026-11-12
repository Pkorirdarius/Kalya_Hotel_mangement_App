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

export function isPaymentPending(status: Payment['status'] | undefined): boolean {
  return status === 'initiated' || status === 'pending';
}

export function isPaymentSucceeded(status: Payment['status'] | undefined): boolean {
  return status === 'succeeded';
}

export function isPaymentFailed(status: Payment['status'] | undefined): boolean {
  return status === 'failed' || status === 'cancelled';
}
