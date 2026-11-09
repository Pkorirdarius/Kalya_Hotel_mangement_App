import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePageMeta } from '../components/Page';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '../i18n-context';
import { EMAIL, PHONE, WHATSAPP_NUMBER } from '../lib/constants';
import { MEAL_PLANS, ROOMS, type MealPlanId } from '../types';
import { addDaysISO, isValidEmail, nightsBetween, todayISO } from '../utils';

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
  cardNumber: string;
  cardName: string;
  cardExpiry: string;
  cardCvv: string;
}

type Errors = Partial<Record<keyof BookingForm, string>>;

const STEP_KEYS = ['step.dates', 'step.room', 'step.details', 'step.payment', 'step.confirm'];

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

function isPhone(value: string): boolean {
  return /^\+?\d{9,15}$/.test(value.replace(/[^\d+]/g, ''));
}

function errorClass(hasError: boolean): string {
  return hasError ? '!border-red-400' : '';
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-[12px] font-medium text-red-600">{message}</p>;
}

export function BookingPage() {
  const { t, formatDate, formatMoney } = useI18n();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  usePageMeta(
    'Book Direct — West Premier Hotel, Kapenguria',
    'Book direct with West Premier Hotel in Westlands, Kapenguria. Best rate guaranteed, free cancellation up to 48 hours and M-Pesa, card or bank payment.',
  );

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
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCvv: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState('');
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  const room = ROOMS.find((item) => item.id === form.roomId) ?? ROOMS[0];
  const meal = MEAL_PLANS.find((item) => item.id === form.mealId) ?? MEAL_PLANS[1];
  const nights = Math.max(0, nightsBetween(form.checkin, form.checkout));
  const roomTotal = room.price * nights;
  const mealTotal = meal.supplement * form.guests * nights;
  const total = roomTotal + mealTotal;
  const nightLabel = nights === 1 ? t('common.night') : t('common.nights');
  const money = (amount: number) => `KES ${formatMoney(amount)}`;

  const goToStep = (next: number) => {
    setStep(Math.min(5, Math.max(1, next)));
    setErrors({});
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const setValue = <K extends keyof BookingForm>(key: K, value: BookingForm[K]) => {
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

  const validateDates = (): boolean => {
    const next: Errors = {};
    if (!form.checkin) {
      next.checkin = t('common.required');
    } else if (form.checkin < today) {
      next.checkin = t('validation.dates');
    }
    if (!form.checkout) {
      next.checkout = t('common.required');
    } else if (nightsBetween(form.checkin, form.checkout) < 1) {
      next.checkout = t('validation.dates');
    }
    setErrors(next);
    focusFirstError(next);
    return Object.keys(next).length === 0;
  };

  const validateGuestDetails = (): boolean => {
    const next: Errors = {};
    if (!form.firstName.trim()) next.firstName = t('common.required');
    if (!form.lastName.trim()) next.lastName = t('common.required');

    if (!form.email.trim()) {
      next.email = t('common.required');
    } else if (!isValidEmail(form.email)) {
      next.email = t('validation.email');
    }

    if (!form.phone.trim()) {
      next.phone = t('common.required');
    } else if (!isPhone(form.phone)) {
      next.phone = t('validation.phone');
    }

    if (!form.terms) next.terms = t('validation.terms');

    setErrors(next);
    focusFirstError(next);
    return Object.keys(next).length === 0;
  };

  const validatePayment = (): boolean => {
    const next: Errors = {};
    if (form.payment === 'mpesa') {
      if (!form.mpesaPhone.trim()) {
        next.mpesaPhone = t('validation.mpesa');
      } else if (!isPhone(form.mpesaPhone)) {
        next.mpesaPhone = t('validation.phone');
      }
    }
    if (form.payment === 'card') {
      if (form.cardNumber.replace(/\s/g, '').length < 13) {
        next.cardNumber = t('validation.card');
      }
      if (!form.cardName.trim()) next.cardName = t('validation.card');
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(form.cardExpiry.trim())) {
        next.cardExpiry = t('validation.card');
      }
      if (!/^\d{3,4}$/.test(form.cardCvv.trim())) {
        next.cardCvv = t('validation.card');
      }
    }
    setErrors(next);
    focusFirstError(next);
    return Object.keys(next).length === 0;
  };

  const completeBooking = () => {
    const nextReference = `KY-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    setReference(nextReference);
    setStep(5);
    showToast(
      form.payment === 'bank' ? t('confirmation.pending') : t('toast.booking'),
      form.payment === 'bank' ? 'info' : 'success',
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step !== 4 || !validatePayment()) {
      return;
    }
    setSubmitting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    setSubmitting(false);
    completeBooking();
  };

  const downloadCalendar = () => {
    const start = form.checkin.replace(/-/g, '');
    const end = form.checkout.replace(/-/g, '');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//West Premier Hotel//Booking//EN',
      'BEGIN:VEVENT',
      `UID:${reference}@westpremierhotel.co.ke`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      'SUMMARY:West Premier Hotel stay',
      'LOCATION:12 Jacaranda Lane\\, Westlands\\, Kapenguria',
      `DESCRIPTION:Booking reference ${reference}. Front desk ${PHONE}.`,
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

  const paymentBadge =
    form.payment === 'bank'
      ? { label: t('confirmation.pending'), className: 'pill bg-gold-soft text-gold-deep ring-1 ring-gold/30' }
      : { label: t('confirmation.paid'), className: 'pill bg-white text-forest ring-1 ring-line' };

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
                      return (
                        <label key={item.id} className="block cursor-pointer">
                          <input
                            type="radio"
                            name="room"
                            value={item.id}
                            className="peer sr-only"
                            checked={selected}
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
                              <p className="mt-1.5 text-[11px] font-semibold text-gold-deep">
                                {t('common.freeCancellation')}
                              </p>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

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
                    <button type="button" className="btn-primary" onClick={() => goToStep(3)}>
                      <span>{t('booking.step2.continue')}</span>
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
                      onClick={() => {
                        if (validateGuestDetails()) goToStep(4);
                      }}
                    >
                      <span>{t('booking.step3.continue')}</span>
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
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label className="field-label" htmlFor="cardNumber">
                              {t('payment.cardNumber')}
                            </label>
                            <input
                              id="cardNumber"
                              name="cardNumber"
                              type="text"
                              inputMode="numeric"
                              autoComplete="cc-number"
                              value={form.cardNumber}
                              onChange={(event) => setValue('cardNumber', event.target.value)}
                              className={`field ${errorClass(Boolean(errors.cardNumber))}`}
                              placeholder="4242 4242 4242 4242"
                              aria-invalid={errors.cardNumber ? 'true' : 'false'}
                            />
                            <FieldError message={errors.cardNumber} />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="field-label" htmlFor="cardName">
                              {t('payment.cardName')}
                            </label>
                            <input
                              id="cardName"
                              name="cardName"
                              type="text"
                              autoComplete="cc-name"
                              value={form.cardName}
                              onChange={(event) => setValue('cardName', event.target.value)}
                              className={`field ${errorClass(Boolean(errors.cardName))}`}
                              aria-invalid={errors.cardName ? 'true' : 'false'}
                            />
                            <FieldError message={errors.cardName} />
                          </div>
                          <div>
                            <label className="field-label" htmlFor="cardExpiry">
                              {t('payment.cardExpiry')}
                            </label>
                            <input
                              id="cardExpiry"
                              name="cardExpiry"
                              type="text"
                              inputMode="numeric"
                              autoComplete="cc-exp"
                              value={form.cardExpiry}
                              onChange={(event) => setValue('cardExpiry', event.target.value)}
                              className={`field ${errorClass(Boolean(errors.cardExpiry))}`}
                              placeholder="MM/YY"
                              aria-invalid={errors.cardExpiry ? 'true' : 'false'}
                            />
                            <FieldError message={errors.cardExpiry} />
                          </div>
                          <div>
                            <label className="field-label" htmlFor="cardCvv">
                              {t('payment.cardCvv')}
                            </label>
                            <input
                              id="cardCvv"
                              name="cardCvv"
                              type="text"
                              inputMode="numeric"
                              autoComplete="cc-csc"
                              value={form.cardCvv}
                              onChange={(event) => setValue('cardCvv', event.target.value)}
                              className={`field ${errorClass(Boolean(errors.cardCvv))}`}
                              placeholder="123"
                              aria-invalid={errors.cardCvv ? 'true' : 'false'}
                            />
                            <FieldError message={errors.cardCvv} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {form.payment === 'bank' ? (
                    <div className="mt-5">
                      <div className="rounded-2xl border border-line p-4 sm:p-5">
                        <p className="text-[13px] font-bold text-forest">{t('payment.bank')}</p>
                        <p className="mt-1 text-[12px] leading-relaxed text-muted">
                          {t('payment.bankText')}
                        </p>
                        <dl className="mt-4 grid gap-2 rounded-xl bg-sand/60 p-4 text-[12px]">
                          {[
                            { label: t('payment.bankLabel'), value: 'Equity Bank Kenya' },
                            { label: t('payment.accountName'), value: 'West Premier Hotel Ltd' },
                            { label: t('payment.accountNumber'), value: '1234 5678 9012' },
                            { label: 'SWIFT', value: 'EQBLKENA' },
                          ].map((row) => (
                            <div key={row.label} className="flex justify-between gap-3">
                              <dt className="text-muted">{row.label}</dt>
                              <dd className="font-semibold text-forest">{row.value}</dd>
                            </div>
                          ))}
                        </dl>
                        <p className="mt-3 text-[11px] leading-relaxed text-muted">
                          {t('payment.bankNote')}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-6">
                    <button type="submit" className="btn-gold w-full sm:w-auto" disabled={submitting}>
                      <span>{submitting ? t('common.sending') : `${t('payment.payNow')} · ${money(total)}`}</span>
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
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-forest-50 text-forest">
                      <span className="material-symbols-outlined text-[30px]" aria-hidden="true">
                        check_circle
                      </span>
                    </span>
                    <div>
                      <h2 id="booking-step-5" className="heading-sm">
                        {t('booking.step5.title')}
                      </h2>
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        {t('booking.step5.text')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl bg-forest-50 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                          {t('confirmation.reference')}
                        </p>
                        <p className="mt-1 font-serif text-2xl text-forest-dark">{reference}</p>
                      </div>
                      <span className={paymentBadge.className}>{paymentBadge.label}</span>
                    </div>
                    <p className="mt-3 text-[12px] text-muted">
                      <span>{t('confirmation.emailSent')}</span>{' '}
                      <span className="font-semibold text-forest">{form.email.trim()}</span>
                    </p>
                  </div>

                  <dl className="mt-5 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                    {[
                      { label: 'summary.room', value: t(room.nameKey) },
                      { label: 'summary.meal', value: t(meal.labelKey) },
                      { label: 'confirmation.arrival', value: formatDate(form.checkin) },
                      { label: 'confirmation.departure', value: formatDate(form.checkout) },
                      {
                        label: 'booking.guests',
                        value: `${form.guests} ${t('common.guests').toLowerCase()} · ${nights} ${nightLabel}`,
                      },
                      { label: 'summary.total', value: money(total) },
                    ].map((item) => (
                      <div key={item.label}>
                        <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                          {t(item.label)}
                        </dt>
                        <dd className="mt-1 font-semibold text-forest">{item.value}</dd>
                      </div>
                    ))}
                  </dl>

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
                      href={`https://wa.me/${WHATSAPP_NUMBER}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost"
                    >
                      {t('confirmation.whatsapp')}
                    </a>
                  </div>
                  <p className="mt-5 text-[12px] text-muted">{t('confirmation.change')}</p>
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
                </div>
              </div>
              <div className="p-5">
                <dl className="space-y-2.5 text-[13px]">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">{t('summary.roomTotal')}</dt>
                    <dd className="font-semibold text-forest">{money(roomTotal)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">{t(meal.labelKey)}</dt>
                    <dd className="font-semibold text-forest">
                      {meal.supplement === 0 ? t('meal.included') : money(mealTotal)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">{t('summary.taxes')}</dt>
                    <dd className="font-semibold text-forest">{t('summary.included')}</dd>
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
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-gold-pale p-3 text-[11px] leading-relaxed text-gold-deep">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                    event_available
                  </span>
                  <span>{t('summary.freeCancel')}</span>
                </div>
                <p className="mt-4 text-[11px] leading-relaxed text-muted">{t('summary.help')}</p>
                <span className="sr-only">{EMAIL}</span>
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
                  <dt className="text-muted">{t(meal.labelKey)}</dt>
                  <dd className="font-semibold text-forest">
                    {meal.supplement === 0 ? t('meal.included') : money(mealTotal)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t('summary.taxes')}</dt>
                  <dd className="font-semibold text-forest">{t('summary.included')}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
