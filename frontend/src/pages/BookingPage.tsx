import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePageMeta } from '../components/Page';
import { useToast } from '../components/ToastProvider';
import { HOTEL, addressText, whatsappHref } from '../config/hotel';
import { useI18n } from '../i18n-context';
import type { Booking, Payment, Quote } from '../lib/api/types';
import { errorMessage, fieldErrors } from '../lib/query/errors';
import {
  useCompleteSandboxPaymentMutation,
  useCreateBookingMutation,
  useInitiateBookingPaymentMutation,
  usePayment,
  usePaymentMethods,
  useQuoteMutation,
  useRoomAvailability,
} from '../lib/query/hooks';
import { MEAL_PLANS, ROOMS, type MealPlanId } from '../types';
import {
  addDaysISO,
  newRequestId,
  nightsBetween,
  todayISO,
} from '../utils';
import {
  fieldErrorKeys,
  guestDetailsSchema,
  normaliseKenyanPhone,
  paymentDetailsSchema,
  stayDatesSchema,
} from '../lib/validation';
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

type PaymentMethod = 'mpesa' | 'card' | 'bank';

interface BookingForm {
  checkin: string;
  checkout: string;
  guests: number;
  purpose: string;
  roomId: string;
  mealId: MealPlanId;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  arrival: string;
  requests: string;
  terms: boolean;
  marketing: boolean;
  payment: PaymentMethod;
  mpesaPhone: string;
}

type Errors = Partial<Record<keyof BookingForm, string>>;

const STEP_KEYS = ['step.dates', 'step.room', 'step.details', 'step.payment', 'step.confirm'];

const BOOKING_FIELDS: Array<keyof BookingForm> = [
  'checkin',
  'checkout',
  'guests',
  'roomId',
  'mealId',
];

const FIELD_MAP: Record<string, keyof BookingForm> = {
  first_name: 'firstName',
  last_name: 'lastName',
  email: 'email',
  phone: 'phone',
  consent_privacy: 'terms',
};

const ARRIVAL_KEYS: Record<string, string> = {
  morning: 'arrival.early',
  afternoon: 'arrival.afternoon',
  evening: 'arrival.evening',
  late: 'arrival.late',
};

const BANK_FIELDS: Array<[string, string]> = [
  ['bank_name', 'payment.bankLabel'],
  ['account_name', 'payment.accountName'],
  ['account_number', 'payment.accountNumber'],
  ['branch', 'payment.branch'],
  ['swift', 'payment.swift'],
];

const COUNTRIES = [
  'Kenya',
  'Uganda',
  'Tanzania',
  'Rwanda',
  'Ethiopia',
  'Somalia',
  'South Sudan',
  'DR Congo',
  'Zambia',
  'Malawi',
  'South Africa',
  'United Kingdom',
  'United States',
  'Germany',
  'Netherlands',
  'India',
  'Other',
];

const DOT_BASE = 'flex h-10 w-10 items-center justify-center rounded-full border text-[13px] font-bold transition';
const DOT_ACTIVE = 'border-forest bg-forest text-white';
const DOT_COMPLETE = 'border-gold bg-gold text-forest-dark';
const DOT_UPCOMING = 'border-line bg-white text-muted';

function isMealPlanId(value: string | null): value is MealPlanId {
  return MEAL_PLANS.some((plan) => plan.id === value);
}

function errorClass(hasError: boolean): string {
  return hasError ? '!border-red-400' : '';
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-[12px] font-medium text-red-600">{message}</p>;
}

export function BookingPage() {
  const { language, t, formatDate, formatMoney } = useI18n();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  usePageMeta(t('meta.booking.title'), t('meta.booking.description'));

  const today = todayISO();
  const offer = searchParams.get('offer');

  const defaults = useMemo(() => {
    let checkin = searchParams.get('checkin') ?? addDaysISO(today, 7);
    let checkout = searchParams.get('checkout') ?? addDaysISO(checkin, 2);

    if (offer === 'long-stay') {
      checkin = addDaysISO(today, 1);
      checkout = addDaysISO(checkin, 4);
    }
    if (checkin < today) {
      checkin = addDaysISO(today, 7);
      checkout = addDaysISO(checkin, 2);
    }
    if (checkout <= checkin) {
      checkout = addDaysISO(checkin, 2);
    }

    const requestedRoom = searchParams.get('room');
    const roomId =
      offer === 'ngo'
        ? ROOMS[0].id
        : ROOMS.find((room) => room.id === requestedRoom)?.id ?? ROOMS[0].id;

    const requestedMeal = searchParams.get('meal');
    const mealId = isMealPlanId(requestedMeal) ? requestedMeal : 'breakfast';

    const requestedGuests = Number(searchParams.get('guests') ?? 2);
    const guests =
      Number.isInteger(requestedGuests) && requestedGuests >= 1 && requestedGuests <= 4
        ? requestedGuests
        : 2;

    return { checkin, checkout, roomId, mealId, guests };
  }, [offer, searchParams, today]);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<BookingForm>({
    checkin: defaults.checkin,
    checkout: defaults.checkout,
    guests: defaults.guests,
    purpose: 'ngo',
    roomId: defaults.roomId,
    mealId: defaults.mealId,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: 'Kenya',
    arrival: 'afternoon',
    requests: '',
    terms: false,
    marketing: false,
    payment: 'mpesa',
    mpesaPhone: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteFor, setQuoteFor] = useState('');
  const [quoteError, setQuoteError] = useState('');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [paymentState, setPayment] = useState<Payment | null>(null);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentSandbox, setPaymentSandbox] = useState(false);
  const [flowError, setFlowError] = useState('');
  const [sandboxBusy, setSandboxBusy] = useState(false);

  const clientRequestId = useRef(newRequestId());
  const paymentAttempt = useRef(0);
  const paidToastShown = useRef(false);

  const quoteMutation = useQuoteMutation();
  const createBookingMutation = useCreateBookingMutation();
  const initiatePaymentMutation = useInitiateBookingPaymentMutation();
  const sandboxMutation = useCompleteSandboxPaymentMutation();
  const paymentMethodsQuery = usePaymentMethods();

  const quoteKey = quoteKeyFor({
    room: form.roomId,
    meal: form.mealId,
    checkin: form.checkin,
    checkout: form.checkout,
    guests: form.guests,
  });
  const activeQuote = quote && quoteFor === quoteKey ? quote : null;

  const availabilityQuery = useRoomAvailability(
    { checkin: form.checkin, checkout: form.checkout, guests: form.guests },
    { enabled: step === 2 },
  );
  const availabilityByRoom = useMemo(() => {
    const rows = new Map<string, { available_rooms: number; fits_guests: boolean }>();
    for (const row of availabilityQuery.data ?? []) {
      rows.set(row.room_type, row);
    }
    return rows;
  }, [availabilityQuery.data]);

  const paymentStateSettled =
    isPaymentSucceeded(paymentState?.status) || isPaymentFailed(paymentState?.status);

  // Tick only while a hold is on screen; the poll stops when it runs out.
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    if (step !== 5) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [step]);

  const holdExpiresAt = booking?.hold_expires_at ?? null;
  const holdSeconds = secondsRemaining(holdExpiresAt, clock);
  const holdExpired = isHoldExpired(holdExpiresAt, clock);

  const paymentQuery = usePayment(
    paymentState?.reference,
    step === 5 &&
      isPaymentPending(paymentState?.status) &&
      !paymentStateSettled &&
      !holdExpired,
  );
  // Prefer the polled record while it matches the payment we initiated, so the
  // UI updates without copying query data into state inside an effect. A local
  // terminal result (sandbox completion) wins over a stale poll.
  const payment =
    paymentQuery.data &&
    paymentState &&
    paymentQuery.data.reference === paymentState.reference &&
    !paymentStateSettled
      ? paymentQuery.data
      : paymentState;
  const paymentStatus = payment?.status;
  const paymentSucceeded = isPaymentSucceeded(paymentStatus);
  const paymentFailed = isPaymentFailed(paymentStatus);

  useEffect(() => {
    if (!paymentSucceeded || paidToastShown.current) {
      return;
    }
    paidToastShown.current = true;
    showToast(t('toast.booking'), 'success');
  }, [paymentSucceeded, showToast, t]);

  const room = ROOMS.find((item) => item.id === form.roomId) ?? ROOMS[0];
  const meal = MEAL_PLANS.find((item) => item.id === form.mealId) ?? MEAL_PLANS[1];
  const nights = Math.max(0, nightsBetween(form.checkin, form.checkout));
  const roomTotal = activeQuote?.accommodation_total ?? room.price * nights;
  const mealTotal = activeQuote?.meal_total ?? meal.supplement * form.guests * nights;
  const discountTotal = activeQuote?.discount_total ?? 0;
  const taxTotal = activeQuote?.tax_total ?? 0;
  const taxIncluded = activeQuote?.tax_included ?? true;
  const total = activeQuote?.total ?? roomTotal + mealTotal;
  const cutoffHours = activeQuote?.cancellation_cutoff_hours ?? 48;
  const reference = booking?.reference ?? '';
  const nightLabel = nights === 1 ? t('common.night') : t('common.nights');
  const money = (amount: number) => `KES ${formatMoney(amount)}`;

  const bankSource = (payment?.instructions ??
    paymentMethodsQuery.data?.bank ??
    {}) as Record<string, unknown>;
  const bankRows = BANK_FIELDS.map(([key, labelKey]) => ({
    label: t(labelKey),
    value: String(bankSource[key] ?? '').trim(),
  })).filter((row) => row.value);

  const resetCreatedBooking = () => {
    if (!booking) {
      return;
    }
    setBooking(null);
    setPayment(null);
    setPaymentMessage('');
    setPaymentSandbox(false);
    setFlowError('');
    paymentAttempt.current = 0;
    paidToastShown.current = false;
    clientRequestId.current = newRequestId();
  };

  const goToStep = (next: number) => {
    const target = Math.min(5, Math.max(1, next));
    if (target === 4 && form.payment === 'mpesa' && !form.mpesaPhone) {
      setValue('mpesaPhone', form.phone);
    }
    setStep(target);
    setErrors({});
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const setValue = <K extends keyof BookingForm>(key: K, value: BookingForm[K]) => {
    if (BOOKING_FIELDS.includes(key)) {
      resetCreatedBooking();
      setQuote(null);
      setQuoteFor('');
      setQuoteError('');
    }
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const focusFirstError = (nextErrors: Errors) => {
    window.requestAnimationFrame(() => {
      const firstKey = Object.keys(nextErrors)[0];
      if (firstKey) {
        document.getElementById(firstKey)?.focus();
      }
    });
  };

  const applyValidation = (keys: Record<string, string>) => {
    const next: Errors = {};
    for (const [field, key] of Object.entries(keys)) {
      next[field as keyof BookingForm] = t(key);
    }
    setErrors(next);
    focusFirstError(next);
    return Object.keys(next).length === 0;
  };

  const validateDates = (): boolean => {
    const result = stayDatesSchema(today).safeParse({
      checkin: form.checkin,
      checkout: form.checkout,
    });
    return applyValidation(fieldErrorKeys(result));
  };

  const validateGuestDetails = (): boolean => {
    const result = guestDetailsSchema.safeParse({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      terms: form.terms,
    });
    return applyValidation(fieldErrorKeys(result));
  };

  const validatePayment = (): boolean => {
    const result = paymentDetailsSchema.safeParse({
      method: form.payment,
      mpesaPhone: form.mpesaPhone,
    });
    return applyValidation(fieldErrorKeys(result));
  };

  const loadQuote = async (): Promise<Quote | null> => {
    const key = quoteKeyFor({
      room: form.roomId,
      meal: form.mealId,
      checkin: form.checkin,
      checkout: form.checkout,
      guests: form.guests,
    });
    setQuoteError('');
    try {
      const result = await quoteMutation.mutateAsync({
        room_type: form.roomId,
        meal_plan: form.mealId,
        checkin: form.checkin,
        checkout: form.checkout,
        guests: form.guests,
      });
      setQuote(result);
      setQuoteFor(key);
      return result;
    } catch (error) {
      setQuoteError(errorMessage(error, t('booking.quoteError')));
      return null;
    }
  };

  const handleRoomsContinue = async () => {
    const row = availabilityByRoom.get(form.roomId);
    if (availabilityQuery.isFetching) {
      setErrors({ roomId: t('booking.checkingAvailability') });
      return;
    }
    if (availabilityQuery.isError || !row) {
      setErrors({ roomId: t('booking.availabilityError') });
      return;
    }
    if (!row.fits_guests) {
      setErrors({ roomId: t('booking.tooManyGuests') });
      return;
    }
    if (row.available_rooms < 1) {
      setErrors({ roomId: t('booking.roomUnavailable') });
      return;
    }
    const result = await loadQuote();
    if (result) {
      goToStep(3);
    }
  };

  const handleDetailsContinue = async () => {
    if (!validateGuestDetails()) {
      return;
    }
    if (!activeQuote) {
      const result = await loadQuote();
      if (!result) {
        return;
      }
    }
    goToStep(4);
  };

  const initiatePaymentFor = async (target: Booking) => {
    const method = backendPaymentMethod(form.payment);
    const result = await initiatePaymentMutation.mutateAsync({
      reference: target.reference,
      body: {
        method,
        email: form.email.trim(),
        phone:
          form.payment === 'mpesa'
            ? normaliseKenyanPhone(form.mpesaPhone)
            : normaliseKenyanPhone(form.phone) || form.phone.trim(),
        idempotency_key: `${target.reference}-${method}-${paymentAttempt.current}`,
      },
    });
    setPayment(result.payment);
    setPaymentMessage(result.message);
    setPaymentSandbox(result.sandbox);
    return result;
  };

  const applyServerErrors = (error: unknown) => {
    const next: Errors = {};
    for (const [key, messages] of Object.entries(fieldErrors(error))) {
      const mapped = FIELD_MAP[key];
      if (mapped && messages[0]) {
        next[mapped] = messages[0];
      }
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      focusFirstError(next);
    }
  };

  const submitBooking = async () => {
    setSubmitting(true);
    setFlowError('');

    const arrivalKey = ARRIVAL_KEYS[form.arrival] ?? 'arrival.afternoon';
    const notes = [
      form.requests.trim(),
      `${t('field.arrivalTime')}: ${t(arrivalKey)}`,
      `${t('booking.purpose.label')}: ${t(`booking.purpose.${form.purpose}`)}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      let target = booking;
      if (!target) {
        const created = await createBookingMutation.mutateAsync({
          quote: {
            room_type: form.roomId,
            meal_plan: form.mealId,
            checkin: form.checkin,
            checkout: form.checkout,
            guests: form.guests,
          },
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          email: form.email.trim(),
          phone: normaliseKenyanPhone(form.phone) || form.phone.trim(),
          country: form.country,
          notes,
          language,
          consent_privacy: form.terms,
          marketing_consent: form.marketing,
          client_request_id: clientRequestId.current,
        });
        target = created.booking;
        setBooking(target);
      }

      try {
        await initiatePaymentFor(target);
      } catch (error) {
        setPayment(null);
        setPaymentMessage('');
        setFlowError(errorMessage(error));
      }
      goToStep(5);
    } catch (error) {
      applyServerErrors(error);
      setFlowError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const retryPayment = async () => {
    if (!booking) {
      goToStep(4);
      return;
    }
    setSubmitting(true);
    setFlowError('');
    setPayment(null);
    setPaymentMessage('');
    paymentAttempt.current += 1;
    try {
      await initiatePaymentFor(booking);
    } catch (error) {
      setFlowError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const simulateSandbox = async (success: boolean) => {
    if (!payment) {
      return;
    }
    setSandboxBusy(true);
    setFlowError('');
    try {
      const result = await sandboxMutation.mutateAsync({
        reference: payment.reference,
        success,
      });
      setPayment(result);
    } catch (error) {
      setFlowError(errorMessage(error));
    } finally {
      setSandboxBusy(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step !== 4 || !validatePayment()) {
      return;
    }
    await submitBooking();
  };

  const downloadCalendar = () => {
    const start = (booking?.checkin ?? form.checkin).replace(/-/g, '');
    const end = (booking?.checkout ?? form.checkout).replace(/-/g, '');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:-//${HOTEL.name}//Booking//EN`,
      'BEGIN:VEVENT',
      `UID:${reference}@${HOTEL.domain}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${HOTEL.name} stay`,
      `LOCATION:${addressText().replace(/,/g, '\\,')}`,
      `DESCRIPTION:Booking reference ${reference}. Front desk ${HOTEL.contact.phoneDisplay}.`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `west-premier-${reference.toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const paymentBadge = paymentSucceeded
    ? { label: t('payment.statusSucceeded'), className: 'pill bg-white text-forest ring-1 ring-line' }
    : paymentFailed
      ? { label: t('payment.statusFailed'), className: 'pill bg-red-50 text-red-700 ring-1 ring-red-200' }
      : { label: t('payment.statusPending'), className: 'pill bg-gold-soft text-gold-deep ring-1 ring-gold/30' };

  const confirmedEmail = booking?.email ?? form.email.trim();
  const confirmedRoom = booking?.room_type_name ?? t(room.nameKey);
  const confirmedMeal = booking?.meal_plan_name ?? t(meal.labelKey);
  const confirmedCheckin = booking?.checkin ?? form.checkin;
  const confirmedCheckout = booking?.checkout ?? form.checkout;
  const confirmedGuests = booking?.guests ?? form.guests;
  const confirmedNights = booking?.nights ?? nights;
  const confirmedTotal = booking?.total ?? total;
  const waitTitle = form.payment === 'mpesa' ? t('payment.waitTitle') : t('payment.pendingTitle');
  const waitText =
    form.payment === 'mpesa'
      ? t('payment.waitText', { phone: form.mpesaPhone || form.phone })
      : t('payment.pendingText');
  const step5Title = paymentSucceeded
    ? t('booking.step5.title')
    : paymentFailed
      ? t('payment.failedTitle')
      : waitTitle;
  const step5Text = paymentSucceeded
    ? t('confirmation.confirmedText')
    : paymentFailed
      ? t('payment.failedText')
      : waitText;
  const step5Icon = paymentSucceeded ? 'check_circle' : paymentFailed ? 'error' : 'hourglass_top';
  const step5IconClass = paymentSucceeded
    ? 'bg-forest-50 text-forest'
    : paymentFailed
      ? 'bg-red-50 text-red-600'
      : 'bg-gold-soft text-gold-deep';

  const changePaymentMethod = () => {
    setPayment(null);
    setPaymentMessage('');
    setFlowError('');
    if (booking) {
      // Force a fresh idempotency key even if the same method is chosen again.
      paymentAttempt.current += 1;
    }
    goToStep(4);
  };

  return (
    <>
      <section className="border-b border-line bg-sand/60 py-10 md:py-14">
        <div className="container-page">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="eyebrow">{t('booking.eyebrow')}</p>
              <h1 className="heading mt-3">{t('booking.title')}</h1>
              <p className="lede mt-3 max-w-2xl">{t('booking.text')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="pill bg-white text-forest ring-1 ring-line">
                <span className="material-symbols-outlined text-[14px] text-gold-deep" aria-hidden="true">
                  verified
                </span>
                <span>{t('booking.bestRate')}</span>
              </span>
              <span className="pill bg-white text-forest ring-1 ring-line">
                <span className="material-symbols-outlined text-[14px] text-gold-deep" aria-hidden="true">
                  event_available
                </span>
                <span>{t('booking.freeCancelShort')}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="rounded-[28px] border border-line bg-white p-5 shadow-soft sm:p-7 lg:p-8">
            <div className="relative">
              <div className="absolute left-5 right-5 top-5 h-px bg-line" aria-hidden="true" />
              <div
                className="absolute left-5 top-5 h-px bg-forest transition-all duration-300"
                style={{ width: `${((step - 1) / 4) * 100}%` }}
                aria-hidden="true"
              />
              <ol className="relative flex items-start justify-between gap-1">
                {[1, 2, 3, 4, 5].map((indicatorStep) => {
                  const complete = indicatorStep < step;
                  const active = indicatorStep === step;
                  return (
                    <li
                      key={indicatorStep}
                      className="flex w-10 flex-col items-center gap-2 text-center sm:w-24"
                      aria-current={active ? 'step' : undefined}
                    >
                      <span
                        className={`${DOT_BASE} ${
                          active ? DOT_ACTIVE : complete ? DOT_COMPLETE : DOT_UPCOMING
                        }`}
                      >
                        {complete ? (
                          <span className="material-symbols-outlined text-[19px]" aria-hidden="true">
                            check
                          </span>
                        ) : (
                          <span>{indicatorStep}</span>
                        )}
                      </span>
                      <span
                        className={`hidden text-[11px] sm:block ${
                          active
                            ? 'font-bold text-forest'
                            : complete
                              ? 'font-semibold text-forest'
                              : 'font-semibold text-muted'
                        }`}
                      >
                        {t(STEP_KEYS[indicatorStep - 1])}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-4 text-center text-[12px] font-semibold text-forest sm:hidden">
                {t(STEP_KEYS[step - 1])} · {step} / 5
              </p>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="mt-8" noValidate>
              {step === 1 ? (
                <section aria-labelledby="booking-step-1">
                  <h2 id="booking-step-1" className="heading-sm">
                    {t('booking.step1.title')}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t('booking.step1.text')}</p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="field-label" htmlFor="checkin">
                        {t('booking.checkin')}
                      </label>
                      <input
                        id="checkin"
                        name="checkin"
                        type="date"
                        required
                        min={today}
                        value={form.checkin}
                        onChange={(event) => {
                          const value = event.target.value;
                          resetCreatedBooking();
                          setQuote(null);
                          setQuoteFor('');
                          setQuoteError('');
                          setForm((current) => {
                            const minCheckout = addDaysISO(value || today, 1);
                            return {
                              ...current,
                              checkin: value,
                              checkout:
                                !current.checkout || current.checkout < minCheckout
                                  ? minCheckout
                                  : current.checkout,
                            };
                          });
                          setErrors((current) => ({ ...current, checkin: undefined }));
                        }}
                        className={`field ${errorClass(Boolean(errors.checkin))}`}
                        aria-invalid={errors.checkin ? 'true' : 'false'}
                      />
                      <FieldError message={errors.checkin} />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="checkout">
                        {t('booking.checkout')}
                      </label>
                      <input
                        id="checkout"
                        name="checkout"
                        type="date"
                        required
                        min={addDaysISO(form.checkin || today, 1)}
                        value={form.checkout}
                        onChange={(event) => setValue('checkout', event.target.value)}
                        className={`field ${errorClass(Boolean(errors.checkout))}`}
                        aria-invalid={errors.checkout ? 'true' : 'false'}
                      />
                      <FieldError message={errors.checkout} />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="guests">
                        {t('booking.guests')}
                      </label>
                      <select
                        id="guests"
                        name="guests"
                        className="field field-select"
                        value={form.guests}
                        onChange={(event) => setValue('guests', Number(event.target.value))}
                      >
                        {[1, 2, 3, 4].map((count) => (
                          <option key={count} value={count}>
                            {t(`booking.guest${count}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="field-label" htmlFor="purpose">
                        {t('booking.purpose.label')}
                      </label>
                      <select
                        id="purpose"
                        name="purpose"
                        className="field field-select"
                        value={form.purpose}
                        onChange={(event) => setValue('purpose', event.target.value)}
                      >
                        <option value="business">{t('booking.purpose.business')}</option>
                        <option value="ngo">{t('booking.purpose.ngo')}</option>
                        <option value="leisure">{t('booking.purpose.leisure')}</option>
                        <option value="local">{t('booking.purpose.local')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 flex items-start gap-3 rounded-2xl bg-forest-50 p-4">
                    <span className="material-symbols-outlined text-[20px] text-forest" aria-hidden="true">
                      event_available
                    </span>
                    <div>
                      <p className="text-[13px] font-bold text-forest">{t('common.freeCancellation')}</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-muted">
                        {t('summary.freeCancel')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-7 flex items-center justify-between gap-3">
                    <p className="hidden text-[12px] text-muted sm:block">
                      <span className="font-semibold text-forest">
                        {nights} {nightLabel}
                      </span>
                    </p>
                    <button
                      type="button"
                      className="btn-primary sm:ml-auto"
                      onClick={() => {
                        if (validateDates()) goToStep(2);
                      }}
                    >
                      <span>{t('booking.step1.continue')}</span>
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        arrow_forward
                      </span>
                    </button>
                  </div>
                </section>
              ) : null}

              {step === 2 ? (
                <section aria-labelledby="booking-step-2">
                  <h2 id="booking-step-2" className="heading-sm">
                    {t('booking.step2.title')}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t('booking.step2.text')}</p>

                  <div className="mt-6 space-y-3">
                    {ROOMS.map((item) => {
                      const selected = form.roomId === item.id;
                      const availability = availabilityByRoom.get(item.id);
                      const soldOut = availability ? availability.available_rooms < 1 : false;
                      const tooSmall = availability ? !availability.fits_guests : false;
                      const unavailable = soldOut || tooSmall;
                      return (
                        <label
                          key={item.id}
                          className={`block ${unavailable ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                        >
                          <input
                            type="radio"
                            name="room"
                            value={item.id}
                            className="peer sr-only"
                            checked={selected}
                            disabled={unavailable}
                            onChange={() => setValue('roomId', item.id)}
                          />
                          <div className="flex gap-3 rounded-2xl border border-line p-3 transition peer-checked:border-forest peer-checked:bg-forest-50 peer-checked:ring-1 peer-checked:ring-forest/25">
                            <img
                              src={item.image.replace('w=1200', 'w=400').replace('q=80', 'q=70')}
                              alt=""
                              className="h-20 w-24 shrink-0 rounded-xl object-cover"
                              loading="lazy"
                            />
                            <div className="flex min-w-0 flex-1 flex-col justify-center">
                              <div className="flex flex-wrap items-start justify-between gap-1">
                                <p className="text-[14px] font-bold text-forest">{t(item.nameKey)}</p>
                                <p className="text-[13px] font-bold text-forest">
                                  KES {formatMoney(item.price)}
                                </p>
                              </div>
                              <p className="mt-1 text-[11px] text-muted">
                                {t(`room.sleeps${item.sleeps}`)} · {item.size} m² · {t(item.bedKey)}
                              </p>
                              {availability ? (
                                <p
                                  className={`mt-1 text-[11px] font-semibold ${
                                    unavailable
                                      ? 'text-red-600'
                                      : availability.available_rooms <= 2
                                        ? 'text-gold-deep'
                                        : 'text-muted'
                                  }`}
                                >
                                  {soldOut
                                    ? t('booking.soldOut')
                                    : tooSmall
                                      ? t('booking.tooManyGuests')
                                      : availability.available_rooms <= 2
                                        ? `${availability.available_rooms} ${t('booking.roomsLeft')}`
                                        : null}
                                </p>
                              ) : availabilityQuery.isFetching ? (
                                <p className="mt-1 text-[11px] text-muted">
                                  {t('booking.checkingAvailability')}
                                </p>
                              ) : null}
                              <p className="mt-1.5 text-[11px] font-semibold text-gold-deep">
                                {t('common.freeCancellation')}
                              </p>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <FieldError message={errors.roomId} />
                  {availabilityQuery.isError ? (
                    <div
                      role="alert"
                      className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700"
                    >
                      <span>{t('booking.availabilityError')}</span>
                      <button
                        type="button"
                        className="inline-flex min-h-[36px] items-center gap-1 font-semibold underline"
                        onClick={() => void availabilityQuery.refetch()}
                      >
                        {t('booking.retry')}
                      </button>
                    </div>
                  ) : null}

                  <fieldset className="mt-7">
                    <legend className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                      {t('meal.title')}
                    </legend>
                    <div className="mt-3 space-y-2">
                      {MEAL_PLANS.map((plan) => {
                        const selected = form.mealId === plan.id;
                        return (
                          <label key={plan.id} className="block cursor-pointer">
                            <input
                              type="radio"
                              name="meal"
                              value={plan.id}
                              className="peer sr-only"
                              checked={selected}
                              onChange={() => setValue('mealId', plan.id)}
                            />
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-3.5 transition peer-checked:border-forest peer-checked:bg-forest-50 peer-checked:ring-1 peer-checked:ring-forest/25">
                              <div>
                                <p className="text-[13px] font-bold text-forest">{t(plan.labelKey)}</p>
                                <p className="mt-0.5 text-[11px] text-muted">{t(plan.noteKey)}</p>
                              </div>
                              {plan.supplement === 0 ? (
                                <p className="shrink-0 text-[12px] font-bold text-muted">
                                  {t('meal.included')}
                                </p>
                              ) : (
                                <p className="shrink-0 text-right text-[12px] font-bold text-forest">
                                  + KES {formatMoney(plan.supplement)}
                                  <span className="block text-[9px] font-semibold text-muted">
                                    {t('meal.perGuestNight')}
                                  </span>
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="mt-7 flex items-center justify-between gap-3">
                    <button type="button" className="btn-ghost btn-sm" onClick={() => goToStep(1)}>
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        arrow_back
                      </span>
                      <span>{t('common.back')}</span>
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={quoteMutation.isPending}
                      onClick={() => void handleRoomsContinue()}
                    >
                      <span>
                        {quoteMutation.isPending ? t('common.sending') : t('booking.step2.continue')}
                      </span>
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        arrow_forward
                      </span>
                    </button>
                  </div>
                </section>
              ) : null}

              {step === 3 ? (
                <section aria-labelledby="booking-step-3">
                  <h2 id="booking-step-3" className="heading-sm">
                    {t('booking.step3.title')}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t('booking.step3.text')}</p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {(
                      [
                        { key: 'firstName', id: 'firstName', label: 'field.firstName', type: 'text', autoComplete: 'given-name' },
                        { key: 'lastName', id: 'lastName', label: 'field.lastName', type: 'text', autoComplete: 'family-name' },
                        { key: 'email', id: 'email', label: 'field.email', type: 'email', autoComplete: 'email' },
                        { key: 'phone', id: 'phone', label: 'field.phone', type: 'tel', autoComplete: 'tel' },
                      ] as const
                    ).map((field) => (
                      <div key={field.key}>
                        <label className="field-label" htmlFor={field.id}>
                          {t(field.label)}
                        </label>
                        <input
                          id={field.id}
                          name={field.id}
                          type={field.type}
                          autoComplete={field.autoComplete}
                          required
                          value={form[field.key]}
                          onChange={(event) => setValue(field.key, event.target.value)}
                          className={`field ${errorClass(Boolean(errors[field.key]))}`}
                          placeholder={field.key === 'phone' ? '+254 712 345 678' : undefined}
                          aria-invalid={errors[field.key] ? 'true' : 'false'}
                        />
                        <FieldError message={errors[field.key]} />
                      </div>
                    ))}

                    <div>
                      <label className="field-label" htmlFor="country">
                        {t('field.country')}
                      </label>
                      <select
                        id="country"
                        name="country"
                        className="field field-select"
                        value={form.country}
                        onChange={(event) => setValue('country', event.target.value)}
                      >
                        {COUNTRIES.map((country) => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="field-label" htmlFor="arrival">
                        {t('field.arrivalTime')}
                      </label>
                      <select
                        id="arrival"
                        name="arrival"
                        className="field field-select"
                        value={form.arrival}
                        onChange={(event) => setValue('arrival', event.target.value)}
                      >
                        <option value="morning">{t('arrival.early')}</option>
                        <option value="afternoon">{t('arrival.afternoon')}</option>
                        <option value="evening">{t('arrival.evening')}</option>
                        <option value="late">{t('arrival.late')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="field-label" htmlFor="requests">
                      {t('field.requests')}
                    </label>
                    <textarea
                      id="requests"
                      name="requests"
                      rows={3}
                      value={form.requests}
                      onChange={(event) => setValue('requests', event.target.value)}
                      className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink shadow-sm transition placeholder:text-muted/60 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15"
                      placeholder={t('field.requestsPlaceholder')}
                    />
                  </div>

                  <div className="mt-4 rounded-2xl bg-sand/60 p-4">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        id="terms"
                        type="checkbox"
                        name="terms"
                        checked={form.terms}
                        onChange={(event) => setValue('terms', event.target.checked)}
                        className="mt-0.5 h-5 w-5 rounded border-line text-forest focus:ring-forest"
                      />
                      <span className="text-[13px] leading-relaxed text-ink/80">
                        {t('field.terms')}
                      </span>
                    </label>
                    <FieldError message={errors.terms} />
                    <label className="mt-3 flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        name="marketing"
                        checked={form.marketing}
                        onChange={(event) => setValue('marketing', event.target.checked)}
                        className="mt-0.5 h-5 w-5 rounded border-line text-forest focus:ring-forest"
                      />
                      <span className="text-[12px] leading-relaxed text-muted">
                        {t('field.marketing')}
                      </span>
                    </label>
                  </div>

                  <div className="mt-7 flex items-center justify-between gap-3">
                    <button type="button" className="btn-ghost btn-sm" onClick={() => goToStep(2)}>
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        arrow_back
                      </span>
                      <span>{t('common.back')}</span>
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={quoteMutation.isPending}
                      onClick={() => void handleDetailsContinue()}
                    >
                      <span>
                        {quoteMutation.isPending ? t('common.sending') : t('booking.step3.continue')}
                      </span>
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        arrow_forward
                      </span>
                    </button>
                  </div>
                </section>
              ) : null}

              {step === 4 ? (
                <section aria-labelledby="booking-step-4">
                  <h2 id="booking-step-4" className="heading-sm">
                    {t('booking.step4.title')}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t('booking.step4.text')}</p>

                  <fieldset className="mt-6">
                    <legend className="sr-only">{t('payment.method')}</legend>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        { value: 'mpesa' as const, icon: 'smartphone', label: 'payment.mpesa', note: 'Safaricom', noteKey: null, iconClass: 'text-[#1FA855]' },
                        { value: 'card' as const, icon: 'credit_card', label: 'payment.card', note: 'Visa · Mastercard', noteKey: null, iconClass: 'text-forest' },
                        { value: 'bank' as const, icon: 'account_balance', label: 'payment.bank', note: null, noteKey: 'payment.lpo', iconClass: 'text-forest' },
                      ].map((method) => (
                        <label key={method.value} className="cursor-pointer">
                          <input
                            type="radio"
                            name="payment"
                            value={method.value}
                            className="peer sr-only"
                            checked={form.payment === method.value}
                            onChange={() => {
                              setValue('payment', method.value);
                              if (method.value === 'mpesa' && !form.mpesaPhone) {
                                setValue('mpesaPhone', form.phone);
                              }
                            }}
                          />
                          <div className="rounded-2xl border border-line p-4 transition peer-checked:border-forest peer-checked:bg-forest-50 peer-checked:ring-1 peer-checked:ring-forest/25">
                            <span
                              className={`material-symbols-outlined text-[24px] ${method.iconClass}`}
                              aria-hidden="true"
                            >
                              {method.icon}
                            </span>
                            <p className="mt-2 text-[13px] font-bold text-forest">{t(method.label)}</p>
                            <p className="mt-0.5 text-[10px] text-muted">
                              {method.noteKey ? t(method.noteKey) : method.note}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {form.payment === 'mpesa' ? (
                    <div className="mt-5">
                      <div className="rounded-2xl border border-line p-4 sm:p-5">
                        <p className="text-[13px] font-bold text-forest">{t('payment.mpesa')}</p>
                        <p className="mt-1 text-[12px] leading-relaxed text-muted">
                          {t('payment.mpesaText')}
                        </p>
                        <div className="mt-4">
                          <label className="field-label" htmlFor="mpesaPhone">
                            {t('payment.mpesaPhone')}
                          </label>
                          <input
                            id="mpesaPhone"
                            name="mpesaPhone"
                            type="tel"
                            value={form.mpesaPhone}
                            onChange={(event) => setValue('mpesaPhone', event.target.value)}
                            className={`field ${errorClass(Boolean(errors.mpesaPhone))}`}
                            placeholder="+254 712 345 678"
                            aria-invalid={errors.mpesaPhone ? 'true' : 'false'}
                          />
                          <FieldError message={errors.mpesaPhone} />
                        </div>
                        <p className="mt-3 inline-flex items-start gap-2 rounded-xl bg-gold-pale px-3 py-2 text-[11px] leading-relaxed text-gold-deep">
                          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                            info
                          </span>
                          <span>{t('payment.mpesaHint')}</span>
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {form.payment === 'card' ? (
                    <div className="mt-5">
                      <div className="rounded-2xl border border-line p-4 sm:p-5">
                        <p className="text-[13px] font-bold text-forest">{t('payment.card')}</p>
                        <p className="mt-1 text-[12px] leading-relaxed text-muted">
                          {t('payment.cardText')}
                        </p>
                        <p className="mt-3 inline-flex items-start gap-2 rounded-xl bg-gold-pale px-3 py-2 text-[11px] leading-relaxed text-gold-deep">
                          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                            lock
                          </span>
                          <span>{t('payment.cardSecureNote')}</span>
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {form.payment === 'bank' ? (
                    <div className="mt-5">
                      <div className="rounded-2xl border border-line p-4 sm:p-5">
                        <p className="text-[13px] font-bold text-forest">{t('payment.bank')}</p>
                        <p className="mt-1 text-[12px] leading-relaxed text-muted">
                          {t('payment.bankIntro')}
                        </p>
                        {bankRows.length > 0 ? (
                          <dl className="mt-4 grid gap-2 rounded-xl bg-sand/60 p-4 text-[12px]">
                            {bankRows.map((row) => (
                              <div key={row.label} className="flex justify-between gap-3">
                                <dt className="text-muted">{row.label}</dt>
                                <dd className="font-semibold text-forest">{row.value}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : (
                          <p className="mt-4 rounded-xl bg-sand/60 p-4 text-[12px] text-muted">
                            {t('payment.bankDetailsSoon')}
                          </p>
                        )}
                        <p className="mt-3 text-[11px] leading-relaxed text-muted">
                          {t('payment.bankNote')}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {flowError ? (
                    <div
                      role="alert"
                      className="mt-5 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700"
                    >
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        error
                      </span>
                      <span>{flowError}</span>
                    </div>
                  ) : null}

                  <div className="mt-6">
                    <button type="submit" className="btn-gold w-full sm:w-auto" disabled={submitting}>
                      <span>
                        {submitting
                          ? t('common.sending')
                          : form.payment === 'bank'
                            ? t('payment.reserveBank')
                            : `${t('payment.payNow')} · ${money(total)}`}
                      </span>
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        lock
                      </span>
                    </button>
                    <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted">
                      <span className="material-symbols-outlined text-[15px] text-forest" aria-hidden="true">
                        verified_user
                      </span>
                      <span>{t('payment.secure')}</span>
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-5">
                    <button type="button" className="btn-ghost btn-sm" onClick={() => goToStep(3)}>
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        arrow_back
                      </span>
                      <span>{t('common.back')}</span>
                    </button>
                    <Link
                      to="/contact"
                      className="text-[12px] font-semibold text-muted transition hover:text-forest"
                    >
                      {t('summary.help')}
                    </Link>
                  </div>
                </section>
              ) : null}

              {step === 5 ? (
                <section aria-labelledby="booking-step-5">
                  <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                    <span
                      className={`flex h-14 w-14 items-center justify-center rounded-full ${step5IconClass}`}
                    >
                      <span className="material-symbols-outlined text-[30px]" aria-hidden="true">
                        {step5Icon}
                      </span>
                    </span>
                    <div>
                      <h2 id="booking-step-5" className="heading-sm">
                        {step5Title}
                      </h2>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{step5Text}</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl bg-forest-50 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                          {t('confirmation.reference')}
                        </p>
                        <p className="mt-1 font-serif text-2xl text-forest-dark">
                          {reference || '—'}
                        </p>
                      </div>
                      <span className={paymentBadge.className}>{paymentBadge.label}</span>
                    </div>
                    <p className="mt-3 text-[12px] text-muted">
                      <span>{t('confirmation.emailSent')}</span>{' '}
                      <span className="font-semibold text-forest">{confirmedEmail}</span>
                    </p>
                    {!paymentSucceeded ? (
                      <p className="mt-1 text-[12px] font-medium text-gold-deep">
                        {t('payment.bookingHeld')}
                      </p>
                    ) : null}
                    {reference ? (
                      <Link
                        to={`/booking/manage?reference=${encodeURIComponent(reference)}`}
                        className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-forest transition hover:text-gold-deep"
                      >
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                          edit_calendar
                        </span>
                        <span>{t('confirmation.manage')}</span>
                      </Link>
                    ) : null}
                  </div>

                  {flowError ? (
                    <div
                      role="alert"
                      className="mt-5 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700"
                    >
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        error
                      </span>
                      <span>{flowError}</span>
                    </div>
                  ) : null}

                  {isPaymentPending(payment?.status) ? (
                    <div className="mt-5 rounded-2xl border border-line p-4 sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                            {t('payment.amountDue')}
                          </p>
                          <p className="mt-1 text-xl font-bold text-forest">
                            {money(confirmedTotal)}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-full bg-gold-pale px-3 py-1.5 text-[11px] font-semibold text-gold-deep">
                          <span
                            className={`h-2 w-2 rounded-full bg-gold-deep ${
                              paymentQuery.isFetching ? 'animate-pulse' : ''
                            }`}
                            aria-hidden="true"
                          />
                          {paymentQuery.isFetching ? t('payment.waiting') : t('payment.statusPending')}
                        </span>
                      </div>
                      {paymentMessage ? (
                        <p className="mt-3 text-[12px] leading-relaxed text-muted">{paymentMessage}</p>
                      ) : null}
                      {holdExpiresAt && !holdExpired ? (
                        <p className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                            timer
                          </span>
                          <span>{t('payment.timeLeft')}</span>
                          <span
                            className="font-mono text-[13px] font-bold tabular-nums text-forest"
                            data-testid="payment-countdown"
                          >
                            {formatCountdown(holdSeconds)}
                          </span>
                        </p>
                      ) : null}
                      {form.payment === 'bank' && bankRows.length > 0 ? (
                        <>
                          <dl className="mt-4 grid gap-2 rounded-xl bg-sand/60 p-4 text-[12px]">
                            {bankRows.map((row) => (
                              <div key={row.label} className="flex justify-between gap-3">
                                <dt className="text-muted">{row.label}</dt>
                                <dd className="font-semibold text-forest">{row.value}</dd>
                              </div>
                            ))}
                          </dl>
                          <p className="mt-3 text-[11px] leading-relaxed text-muted">
                            {t('payment.bankPending')}
                          </p>
                        </>
                      ) : null}
                    </div>
                  ) : null}

                  {paymentFailed ? (
                    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5">
                      <p className="text-[13px] font-bold text-red-700">{t('payment.failedTitle')}</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-red-700/80">
                        {payment?.failure_message || t('payment.failedText')}
                      </p>
                      <p className="mt-3 text-[12px] font-semibold text-forest">
                        {t('payment.amountDue')}: {money(confirmedTotal)}
                      </p>
                    </div>
                  ) : null}

                  {holdExpired ? (
                    <div
                      role="alert"
                      className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5"
                    >
                      <p className="text-[13px] font-bold text-red-700">
                        {t('payment.holdExpiredTitle')}
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-red-700/80">
                        {t('payment.holdExpiredText')}
                      </p>
                      <a href={HOTEL.contact.phoneHref} className="btn-outline btn-sm mt-3">
                        {t('payment.contactDesk')}
                      </a>
                    </div>
                  ) : null}

                  {paymentSandbox && isPaymentPending(payment?.status) && !holdExpired ? (
                    <div className="mt-5 rounded-2xl border border-dashed border-gold/60 bg-gold-pale p-4 sm:p-5">
                      <p className="inline-flex items-center gap-2 text-[12px] font-bold text-gold-deep">
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                          science
                        </span>
                        <span>{t('payment.sandbox')}</span>
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-gold-deep/80">
                        {t('payment.sandboxText')}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          disabled={sandboxBusy}
                          onClick={() => void simulateSandbox(true)}
                        >
                          {t('payment.sandboxSuccess')}
                        </button>
                        <button
                          type="button"
                          className="btn-outline btn-sm"
                          disabled={sandboxBusy}
                          onClick={() => void simulateSandbox(false)}
                        >
                          {t('payment.sandboxFail')}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {!paymentSucceeded && !holdExpired ? (
                    <div className="mt-5 flex flex-wrap gap-3">
                      {!payment || paymentFailed ? (
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={submitting}
                          onClick={() => void retryPayment()}
                        >
                          <span>
                            {submitting ? t('common.sending') : t('payment.retry')}
                          </span>
                          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                            refresh
                          </span>
                        </button>
                      ) : null}
                      <button type="button" className="btn-outline" onClick={changePaymentMethod}>
                        {t('payment.changeMethod')}
                      </button>
                      {payment ? (
                        <button
                          type="button"
                          className="btn-ghost"
                          disabled={paymentQuery.isFetching}
                          onClick={() => void paymentQuery.refetch()}
                        >
                          {paymentQuery.isFetching ? t('common.sending') : t('payment.refresh')}
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  <dl className="mt-6 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                    {[
                      { label: 'summary.room', value: confirmedRoom },
                      { label: 'summary.meal', value: confirmedMeal },
                      { label: 'confirmation.arrival', value: formatDate(confirmedCheckin) },
                      { label: 'confirmation.departure', value: formatDate(confirmedCheckout) },
                      {
                        label: 'booking.guests',
                        value: `${confirmedGuests} ${t('common.guests').toLowerCase()} · ${confirmedNights} ${nightLabel}`,
                      },
                      { label: 'summary.total', value: money(confirmedTotal) },
                    ].map((item) => (
                      <div key={item.label}>
                        <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                          {t(item.label)}
                        </dt>
                        <dd className="mt-1 font-semibold text-forest">{item.value}</dd>
                      </div>
                    ))}
                  </dl>

                  {paymentSucceeded ? (
                    <>
                      <div className="mt-7 flex flex-wrap gap-3">
                        <button type="button" className="btn-primary" onClick={downloadCalendar}>
                          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                            calendar_add_on
                          </span>
                          <span>{t('confirmation.addCalendar')}</span>
                        </button>
                        <Link to="/" className="btn-outline">
                          {t('confirmation.backHome')}
                        </Link>
                        <a
                          href={whatsappHref()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-ghost"
                        >
                          {t('confirmation.whatsapp')}
                        </a>
                      </div>
                      <p className="mt-5 text-[12px] text-muted">{t('confirmation.change')}</p>
                    </>
                  ) : null}
                </section>
              ) : null}
            </form>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="overflow-hidden rounded-[28px] border border-line bg-white shadow-soft">
              <div className="bg-forest p-5 text-white">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-serif text-xl">{t('summary.title')}</h2>
                  <span className="pill bg-white/10 text-gold ring-1 ring-white/15">
                    <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
                      event_available
                    </span>
                    <span>{t('common.freeCancellation')}</span>
                  </span>
                </div>
                <div className="mt-4 rounded-2xl bg-white/10 p-4">
                  <p className="text-sm font-bold">{t(room.nameKey)}</p>
                  <p className="mt-1 text-[12px] text-white/65">
                    {nights > 0 ? `${formatDate(form.checkin)} → ${formatDate(form.checkout)}` : '—'}
                  </p>
                  <p className="mt-1 text-[12px] text-white/65">
                    {form.guests} {t('common.guests').toLowerCase()} · {nights} {nightLabel}
                  </p>
                  {step < 5 ? (
                    <button
                      type="button"
                      onClick={() => goToStep(1)}
                      className="mt-2 inline-flex min-h-[36px] items-center gap-1 text-[11px] font-semibold text-gold transition hover:text-gold-soft"
                    >
                      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                        edit_calendar
                      </span>
                      <span>{t('booking.checkin')}</span>
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="p-5">
                <dl className="space-y-2.5 text-[13px]">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">{t('summary.roomTotal')}</dt>
                    <dd className="font-semibold text-forest">{money(roomTotal)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">{t('summary.mealTotal')}</dt>
                    <dd className="font-semibold text-forest">
                      {mealTotal === 0 ? t('meal.included') : money(mealTotal)}
                    </dd>
                  </div>
                  {discountTotal > 0 ? (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted">{t('summary.discount')}</dt>
                      <dd className="font-semibold text-forest">− {money(discountTotal)}</dd>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">{t('summary.taxes')}</dt>
                    <dd className="font-semibold text-forest">
                      {taxIncluded ? t('summary.included') : money(taxTotal)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                    <dt className="text-sm font-bold text-forest">{t('summary.total')}</dt>
                    <dd className="text-lg font-bold text-forest">{money(total)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">{t('summary.deposit')}</dt>
                    <dd className="font-semibold text-forest">{money(total)}</dd>
                  </div>
                </dl>
                {quoteError ? (
                  <div
                    role="alert"
                    className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-medium text-red-700"
                  >
                    {quoteError}
                  </div>
                ) : null}
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-gold-pale p-3 text-[11px] leading-relaxed text-gold-deep">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                    event_available
                  </span>
                  <span>{t('summary.freeCancelHours', { hours: cutoffHours })}</span>
                </div>
                <p className="mt-4 text-[11px] leading-relaxed text-muted">{t('summary.help')}</p>
                <span className="sr-only">{HOTEL.contact.email}</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {step < 5 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white px-4 py-3 shadow-[0_-10px_30px_-18px_rgba(6,37,27,0.25)] lg:hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3"
            onClick={() => setMobileSummaryOpen((open) => !open)}
            aria-expanded={mobileSummaryOpen}
            aria-controls="mobile-summary-details"
          >
            <span className="text-left">
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                {t('summary.total')}
              </span>
              <span className="block text-lg font-bold text-forest">{money(total)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-2 text-[12px] font-semibold text-forest">
              <span>{t('summary.details')}</span>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                {mobileSummaryOpen ? 'expand_more' : 'expand_less'}
              </span>
            </span>
          </button>
          {mobileSummaryOpen ? (
            <div id="mobile-summary-details" className="pt-3">
              <dl className="space-y-1.5 border-t border-line pt-3 text-[12px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t('summary.roomTotal')}</dt>
                  <dd className="font-semibold text-forest">{money(roomTotal)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t('summary.mealTotal')}</dt>
                  <dd className="font-semibold text-forest">
                    {mealTotal === 0 ? t('meal.included') : money(mealTotal)}
                  </dd>
                </div>
                {discountTotal > 0 ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">{t('summary.discount')}</dt>
                    <dd className="font-semibold text-forest">− {money(discountTotal)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t('summary.taxes')}</dt>
                  <dd className="font-semibold text-forest">
                    {taxIncluded ? t('summary.included') : money(taxTotal)}
                  </dd>
                </div>
              </dl>
              {quoteError ? (
                <p className="mt-2 text-[11px] font-medium text-red-700">{quoteError}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
