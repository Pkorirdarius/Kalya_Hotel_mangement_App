import { describe, expect, it } from 'vitest';

import {
  emailSchema,
  fieldErrorKeys,
  guestDetailsSchema,
  guestLimitsSchema,
  kenyanPhoneSchema,
  normaliseKenyanPhone,
  paymentDetailsSchema,
  stayDatesSchema,
} from './validation';

describe('shared form validation', () => {
  it('normalises Kenyan mobile numbers to 2547XXXXXXXX / 2541XXXXXXXX', () => {
    expect(normaliseKenyanPhone('0712 345 678')).toBe('254712345678');
    expect(normaliseKenyanPhone('+254 712 345 678')).toBe('254712345678');
    expect(normaliseKenyanPhone('254712345678')).toBe('254712345678');
    expect(normaliseKenyanPhone('0112 345 678')).toBe('254112345678');
    expect(normaliseKenyanPhone('+254112345678')).toBe('254112345678');
    expect(normaliseKenyanPhone('254112345678')).toBe('254112345678');
  });

  it('rejects numbers that are not Kenyan mobiles', () => {
    expect(normaliseKenyanPhone('020 765 4321')).toBe('');
    expect(normaliseKenyanPhone('0712345')).toBe('');
    expect(normaliseKenyanPhone('+1 555 0100')).toBe('');
    expect(kenyanPhoneSchema.safeParse('0712345678').success).toBe(true);
    expect(kenyanPhoneSchema.safeParse('not a phone').success).toBe(false);
  });

  it('validates email addresses', () => {
    expect(emailSchema.safeParse('amina@example.com').success).toBe(true);
    expect(emailSchema.safeParse('amina@example').success).toBe(false);
    expect(emailSchema.safeParse('').success).toBe(false);
  });

  it('collects the first error key per guest field', () => {
    const result = guestDetailsSchema.safeParse({
      firstName: '',
      lastName: 'Otieno',
      email: 'nope',
      phone: '123',
      terms: false,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = fieldErrorKeys(result);
    expect(errors.firstName).toBe('common.required');
    expect(errors.email).toBe('validation.email');
    expect(errors.phone).toBe('validation.phoneKe');
    expect(errors.terms).toBe('validation.terms');
    expect(errors.lastName).toBeUndefined();
  });

  it('enforces guest limits', () => {
    expect(guestLimitsSchema.safeParse({ guests: 1 }).success).toBe(true);
    expect(guestLimitsSchema.safeParse({ guests: 10 }).success).toBe(true);
    expect(guestLimitsSchema.safeParse({ guests: 0 }).success).toBe(false);
    expect(guestLimitsSchema.safeParse({ guests: 11 }).success).toBe(false);
    expect(guestLimitsSchema.safeParse({ guests: 2.5 }).success).toBe(false);
  });

  it('validates stay dates against today', () => {
    const schema = stayDatesSchema('2026-12-01');
    expect(
      schema.safeParse({ checkin: '2026-12-02', checkout: '2026-12-04' }).success,
    ).toBe(true);
    const past = schema.safeParse({
      checkin: '2026-11-30',
      checkout: '2026-12-02',
    });
    expect(past.success).toBe(false);
    if (!past.success) {
      expect(fieldErrorKeys(past).checkin).toBe('validation.dates');
    }
    const backwards = schema.safeParse({
      checkin: '2026-12-04',
      checkout: '2026-12-02',
    });
    expect(backwards.success).toBe(false);
    if (!backwards.success) {
      expect(fieldErrorKeys(backwards).checkout).toBe('validation.dates');
    }
  });

  it('requires an M-Pesa phone only for M-Pesa', () => {
    expect(
      paymentDetailsSchema.safeParse({ method: 'mpesa', mpesaPhone: '' }).success,
    ).toBe(false);
    expect(
      paymentDetailsSchema.safeParse({
        method: 'mpesa',
        mpesaPhone: '0712345678',
      }).success,
    ).toBe(true);
    expect(
      paymentDetailsSchema.safeParse({ method: 'card', mpesaPhone: '' }).success,
    ).toBe(true);
    expect(
      paymentDetailsSchema.safeParse({ method: 'bank', mpesaPhone: 'nope' }).success,
    ).toBe(true);
  });
});
