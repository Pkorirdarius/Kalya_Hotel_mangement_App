import { z } from 'zod';

/**
 * Shared Zod schemas for every controlled form.
 *
 * Messages are i18n keys, not sentences, so the same schema serves English and
 * Swahili. Forms keep their controlled React state; these schemas only decide
 * whether the current values may be submitted.
 */

/** Convert 07XX..., 01XX..., +254..., 254... or 2547... to 2547XXXXXXXX. */
export function normaliseKenyanPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  let local = '';

  if (/^0[17]\d{8}$/.test(digits)) {
    local = digits.slice(1);
  } else if (/^254[17]\d{8}$/.test(digits)) {
    local = digits.slice(3);
  } else if (/^[17]\d{8}$/.test(digits)) {
    local = digits;
  }

  return /^[17]\d{8}$/.test(local) ? `254${local}` : '';
}

export const kenyanPhoneSchema = z
  .string()
  .trim()
  .min(1, { message: 'common.required' })
  .refine((value) => normaliseKenyanPhone(value) !== '', {
    message: 'validation.phoneKe',
  });

export const emailSchema = z
  .string()
  .trim()
  .min(1, { message: 'common.required' })
  .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value), {
    message: 'validation.email',
  });

export const guestDetailsSchema = z.object({
  firstName: z.string().trim().min(1, { message: 'common.required' }),
  lastName: z.string().trim().min(1, { message: 'common.required' }),
  email: emailSchema,
  phone: kenyanPhoneSchema,
  terms: z.boolean().refine((value) => value, {
    message: 'validation.terms',
  }),
});

export const guestLimitsSchema = z.object({
  guests: z
    .number()
    .int({ message: 'validation.guests' })
    .min(1, { message: 'validation.guests' })
    .max(10, { message: 'validation.guests' }),
});

export interface StayDateInput {
  checkin: string;
  checkout: string;
}

/** Dates depend on "today", so the schema is created per render/session. */
export function stayDatesSchema(today: string) {
  return z
    .object({
      checkin: z.string().min(1, { message: 'common.required' }),
      checkout: z.string().min(1, { message: 'common.required' }),
    })
    .superRefine((value, context) => {
      if (value.checkin && value.checkin < today) {
        context.addIssue({
          code: 'custom',
          path: ['checkin'],
          message: 'validation.dates',
        });
      }
      if (value.checkin && value.checkout && value.checkout <= value.checkin) {
        context.addIssue({
          code: 'custom',
          path: ['checkout'],
          message: 'validation.dates',
        });
      }
    });
}

export type BookingPaymentMethod = 'mpesa' | 'card' | 'bank';

export const paymentDetailsSchema = z
  .object({
    method: z.enum(['mpesa', 'card', 'bank']),
    mpesaPhone: z.string(),
  })
  .superRefine((value, context) => {
    if (value.method !== 'mpesa') return;
    if (!value.mpesaPhone.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['mpesaPhone'],
        message: 'validation.mpesa',
      });
      return;
    }
    if (!kenyanPhoneSchema.safeParse(value.mpesaPhone).success) {
      context.addIssue({
        code: 'custom',
        path: ['mpesaPhone'],
        message: 'validation.phoneKe',
      });
    }
  });

/** First i18n key per field, ready for a controlled form's error map. */
export function fieldErrorKeys(
  result: { success: false; error: z.ZodError } | { success: true; data: unknown },
): Record<string, string> {
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? '');
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}
