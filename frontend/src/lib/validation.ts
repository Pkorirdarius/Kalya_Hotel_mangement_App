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

/** Split a "Full name" field for APIs that require first/last names. */
export function splitFullName(value: string): { firstName: string; lastName: string } {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

/**
 * Facility forms collect one "Full name" field, while the backend stores a
 * first and last name. Require both parts so we never send an empty surname.
 */
export const fullNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'common.required' })
  .refine((value) => splitFullName(value).lastName.length > 0, {
    message: 'validation.fullName',
  });

function optionalEmailSchema() {
  return z
    .string()
    .trim()
    .refine((value) => value === '' || emailSchema.safeParse(value).success, {
      message: 'validation.email',
    });
}

function futureOrTodayDateSchema(today: string) {
  return z
    .string()
    .min(1, { message: 'common.required' })
    .refine((value) => value >= today, { message: 'validation.date' });
}

export const CONFERENCE_SESSIONS = ['breakfast', 'half_day', 'full_day'] as const;
export const CONFERENCE_LAYOUTS = ['theatre', 'boardroom', 'ushape', 'classroom'] as const;

export function tableBookingSchema(today: string) {
  return z.object({
    date: futureOrTodayDateSchema(today),
    time: z.string().min(1, { message: 'validation.time' }),
    partySize: z
      .number()
      .int({ message: 'validation.partySize' })
      .min(1, { message: 'validation.partySize' })
      .max(20, { message: 'validation.partySize' }),
    fullName: fullNameSchema,
    phone: kenyanPhoneSchema,
    email: optionalEmailSchema(),
  });
}

export function conferenceEnquirySchema(today: string) {
  return z.object({
    date: futureOrTodayDateSchema(today),
    session: z.enum(CONFERENCE_SESSIONS),
    layout: z.enum(CONFERENCE_LAYOUTS),
    people: z
      .number()
      .int({ message: 'validation.guests' })
      .min(4, { message: 'validation.guests' })
      .max(120, { message: 'validation.guests' }),
    fullName: fullNameSchema,
    email: emailSchema,
    phone: kenyanPhoneSchema,
  });
}

export function gymDayPassSchema(today: string) {
  return z.object({
    fullName: z.string().trim().min(2, { message: 'validation.name' }),
    phone: kenyanPhoneSchema,
    date: futureOrTodayDateSchema(today),
  });
}

export type BookingPaymentMethod = 'mpesa' | 'card' | 'bank';

/**
 * Guest booking lookup: a reference plus at least one verified contact detail.
 * The backend returns a generic 404 when either piece is wrong, so the form
 * only has to decide whether there is enough information to ask.
 */
export const bookingLookupSchema = z
  .object({
    reference: z.string().trim().min(1, { message: 'common.required' }),
    email: z.string().trim(),
    phone: z.string().trim(),
  })
  .superRefine((value, context) => {
    if (!value.email && !value.phone) {
      context.addIssue({
        code: 'custom',
        path: ['email'],
        message: 'validation.lookupContact',
      });
      return;
    }
    if (value.email && !emailSchema.safeParse(value.email).success) {
      context.addIssue({
        code: 'custom',
        path: ['email'],
        message: 'validation.email',
      });
    }
    if (value.phone && !kenyanPhoneSchema.safeParse(value.phone).success) {
      context.addIssue({
        code: 'custom',
        path: ['phone'],
        message: 'validation.phoneKe',
      });
    }
  });

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
