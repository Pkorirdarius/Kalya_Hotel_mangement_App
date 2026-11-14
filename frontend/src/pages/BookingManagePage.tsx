import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePageMeta } from '../components/Page';
import { useToast } from '../components/ToastProvider';
import { HOTEL } from '../config/hotel';
import { useI18n } from '../i18n-context';
import { ApiError } from '../lib/api/client';
import type { Booking } from '../lib/api/types';
import { errorMessage } from '../lib/query/errors';
import { useBooking, useCancelBookingMutation } from '../lib/query/hooks';
import type { Contact } from '../lib/query/keys';
import {
  bookingLookupSchema,
  fieldErrorKeys,
  normaliseKenyanPhone,
} from '../lib/validation';

interface LookupForm {
  reference: string;
  email: string;
  phone: string;
}

type Errors = Partial<Record<keyof LookupForm, string>>;

const EMPTY_CONTACT: Contact = {};
const CLOSED_STATUSES = ['cancelled', 'declined', 'expired'];

const STATUS_TONES: Record<string, string> = {
  confirmed: 'bg-forest-50 text-forest ring-forest/20',
  held: 'bg-gold-pale text-gold-deep ring-gold/30',
  pending_payment: 'bg-gold-pale text-gold-deep ring-gold/30',
  pending_confirmation: 'bg-gold-pale text-gold-deep ring-gold/30',
  cancelled: 'bg-red-50 text-red-700 ring-red-200',
  declined: 'bg-red-50 text-red-700 ring-red-200',
  expired: 'bg-red-50 text-red-700 ring-red-200',
};

function errorClass(hasError: boolean): string {
  return hasError ? '!border-red-400' : '';
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-[12px] font-medium text-red-600">{message}</p>;
}

function formatDeadline(value: string, language: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'sw' ? 'sw-KE' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function BookingManagePage() {
  const { language, t, formatDate, formatMoney } = useI18n();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  usePageMeta(t('meta.manage.title'), t('meta.manage.description'), true);

  const [form, setForm] = useState<LookupForm>({
    reference: searchParams.get('reference') ?? '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [contact, setContact] = useState<Contact | null>(null);
  const [submittedReference, setSubmittedReference] = useState('');
  const [cancelled, setCancelled] = useState<Booking | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const bookingQuery = useBooking(
    contact ? submittedReference : undefined,
    contact ?? EMPTY_CONTACT,
  );
  const cancelMutation = useCancelBookingMutation(contact ?? EMPTY_CONTACT);

  const booking = cancelled ?? bookingQuery.data;
  const closed = booking ? CLOSED_STATUSES.includes(booking.status ?? '') : false;
  const canCancel = Boolean(booking?.can_cancel) && !closed;
  const payment = booking?.latest_payment ?? null;

  const paymentLabel = (() => {
    if (!payment) return t('manage.noPayment');
    if (payment.status === 'succeeded') return t('payment.statusSucceeded');
    if (payment.status === 'failed' || payment.status === 'cancelled') {
      return t('payment.statusFailed');
    }
    if (payment.status === 'refunded') return t('manage.paymentRefunded');
    return t('payment.statusPending');
  })();

  const setValue = (key: keyof LookupForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = (): boolean => {
    const result = bookingLookupSchema.safeParse(form);
    const keys = fieldErrorKeys(result);
    const next: Errors = {};
    for (const [field, key] of Object.entries(keys)) {
      next[field as keyof LookupForm] = t(key);
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const first = Object.keys(next)[0];
      window.requestAnimationFrame(() => document.getElementById(first)?.focus());
      return false;
    }
    return true;
  };

  const handleLookup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    setCancelled(null);
    setCancelOpen(false);
    setCancelError('');
    const reference = form.reference.trim().toUpperCase();
    setSubmittedReference(reference);
    setContact({
      email: form.email.trim() || undefined,
      phone: normaliseKenyanPhone(form.phone) || undefined,
    });
  };

  const resetLookup = () => {
    setForm({ reference: '', email: '', phone: '' });
    setErrors({});
    setContact(null);
    setSubmittedReference('');
    setCancelled(null);
    setCancelOpen(false);
    setCancelError('');
  };

  const handleCancel = async () => {
    if (!booking) return;
    setCancelError('');
    try {
      const updated = await cancelMutation.mutateAsync({
        reference: booking.reference,
        reason: cancelReason.trim() || undefined,
      });
      setCancelled(updated);
      setCancelOpen(false);
      setCancelReason('');
      showToast(t('manage.cancelledToast'), 'success');
    } catch (error) {
      setCancelError(
        error instanceof ApiError && error.status === 409
          ? error.message
          : errorMessage(error, t('manage.cancelError')),
      );
    }
  };

  const lookupMessage = (() => {
    const error = bookingQuery.error;
    if (!error) return '';
    if (error instanceof ApiError && error.status === 404) {
      return t('manage.notFound');
    }
    return errorMessage(error, t('manage.lookupError'));
  })();

  return (
    <>
      <section className="border-b border-line bg-sand/60 py-10 md:py-14">
        <div className="container-page">
          <p className="eyebrow">{t('manage.eyebrow')}</p>
          <h1 className="heading mt-3">{t('manage.title')}</h1>
          <p className="lede mt-3 max-w-2xl">{t('manage.text')}</p>
        </div>
      </section>

      <section className="container-page py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-line bg-white p-5 shadow-soft sm:p-7">
              <h2 className="heading-sm">{t('manage.formTitle')}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {t('manage.formText')}
              </p>

              <form onSubmit={handleLookup} className="mt-6" noValidate>
                <div>
                  <label className="field-label" htmlFor="reference">
                    {t('manage.reference')}
                  </label>
                  <input
                    id="reference"
                    name="reference"
                    type="text"
                    autoComplete="off"
                    value={form.reference}
                    onChange={(event) => setValue('reference', event.target.value.toUpperCase())}
                    className={`field uppercase tracking-wide ${errorClass(Boolean(errors.reference))}`}
                    placeholder="WP-2026-0001"
                    aria-invalid={errors.reference ? 'true' : 'false'}
                  />
                  <FieldError message={errors.reference} />
                </div>

                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-line" aria-hidden="true" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                    {t('manage.or')}
                  </span>
                  <span className="h-px flex-1 bg-line" aria-hidden="true" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="field-label" htmlFor="lookupEmail">
                      {t('field.email')}
                    </label>
                    <input
                      id="lookupEmail"
                      name="lookupEmail"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(event) => setValue('email', event.target.value)}
                      className={`field ${errorClass(Boolean(errors.email))}`}
                      aria-invalid={errors.email ? 'true' : 'false'}
                    />
                    <FieldError message={errors.email} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="lookupPhone">
                      {t('field.phone')}
                    </label>
                    <input
                      id="lookupPhone"
                      name="lookupPhone"
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(event) => setValue('phone', event.target.value)}
                      className={`field ${errorClass(Boolean(errors.phone))}`}
                      placeholder="+254 712 345 678"
                      aria-invalid={errors.phone ? 'true' : 'false'}
                    />
                    <FieldError message={errors.phone} />
                  </div>
                </div>

                <p className="mt-3 inline-flex items-start gap-2 rounded-xl bg-sand/60 px-3 py-2 text-[11px] leading-relaxed text-muted">
                  <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                    info
                  </span>
                  <span>{t('manage.contactHint')}</span>
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={bookingQuery.isFetching}
                  >
                    <span>
                      {bookingQuery.isFetching ? t('manage.searching') : t('manage.submit')}
                    </span>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      search
                    </span>
                  </button>
                  {booking ? (
                    <button type="button" className="btn-ghost btn-sm" onClick={resetLookup}>
                      {t('manage.startOver')}
                    </button>
                  ) : null}
                </div>
              </form>
            </div>

            {contact && bookingQuery.isFetching && !booking ? (
              <div
                role="status"
                className="flex items-center gap-3 rounded-2xl border border-line bg-white p-5 text-sm text-muted"
              >
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-forest" />
                <span>{t('manage.searching')}</span>
              </div>
            ) : null}

            {contact && bookingQuery.isError && !booking ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  error
                </span>
                <span>{lookupMessage}</span>
              </div>
            ) : null}

            {booking ? (
              <div className="rounded-[28px] border border-line bg-white p-5 shadow-soft sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                      {t('confirmation.reference')}
                    </p>
                    <p className="mt-1 font-serif text-2xl text-forest-dark">
                      {booking.reference}
                    </p>
                  </div>
                  <span
                    className={`pill ring-1 ${
                      STATUS_TONES[booking.status ?? ''] ?? 'bg-sand text-forest ring-line'
                    }`}
                  >
                    {t(`manage.status.${booking.status ?? ''}`)}
                  </span>
                </div>

                {cancelled ? (
                  <div className="mt-4 rounded-2xl bg-forest-50 p-4 text-[13px] leading-relaxed text-forest">
                    <p className="font-bold">{t('manage.cancelledTitle')}</p>
                    <p className="mt-1">{t('manage.cancelledText')}</p>
                  </div>
                ) : null}

                <dl className="mt-6 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                  {[
                    { label: 'summary.room', value: booking.room_type_name },
                    { label: 'summary.meal', value: booking.meal_plan_name },
                    { label: 'confirmation.arrival', value: formatDate(booking.checkin) },
                    { label: 'confirmation.departure', value: formatDate(booking.checkout) },
                    {
                      label: 'booking.guests',
                      value: `${booking.guests} ${t('common.guests').toLowerCase()}`,
                    },
                    {
                      label: 'summary.total',
                      value: `KES ${formatMoney(booking.total)}`,
                    },
                    { label: 'manage.paymentStatus', value: paymentLabel },
                    {
                      label: 'manage.bookedOn',
                      value: formatDate(booking.created_at.slice(0, 10)),
                    },
                  ].map((item) => (
                    <div key={item.label}>
                      <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                        {t(item.label)}
                      </dt>
                      <dd className="mt-1 font-semibold text-forest">{item.value}</dd>
                    </div>
                  ))}
                </dl>

                {booking.free_cancellation_until ? (
                  <p
                    className={`mt-5 inline-flex items-start gap-2 rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
                      canCancel
                        ? 'bg-forest-50 text-forest'
                        : 'bg-sand text-muted'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                      event_available
                    </span>
                    <span>
                      {t(
                        canCancel
                          ? 'manage.cancelDeadline'
                          : 'manage.cancelDeadlinePassed',
                        { date: formatDeadline(booking.free_cancellation_until, language) },
                      )}
                    </span>
                  </p>
                ) : null}

                {canCancel ? (
                  cancelOpen ? (
                    <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5">
                      <p className="text-[13px] font-bold text-red-700">
                        {t('manage.cancelConfirmTitle')}
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-red-700/80">
                        {t('manage.cancelConfirmText')}
                      </p>
                      <label className="field-label mt-4" htmlFor="cancelReason">
                        {t('manage.cancelReason')}
                      </label>
                      <textarea
                        id="cancelReason"
                        name="cancelReason"
                        rows={2}
                        value={cancelReason}
                        onChange={(event) => setCancelReason(event.target.value)}
                        className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-[14px] text-ink shadow-sm transition placeholder:text-muted/60 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200"
                        placeholder={t('manage.cancelReasonPlaceholder')}
                      />
                      {cancelError ? (
                        <p role="alert" className="mt-2 text-[12px] font-medium text-red-700">
                          {cancelError}
                        </p>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          className="btn-primary !bg-red-600 hover:!bg-red-700"
                          disabled={cancelMutation.isPending}
                          onClick={() => void handleCancel()}
                        >
                          {cancelMutation.isPending
                            ? t('common.sending')
                            : t('manage.cancelConfirm')}
                        </button>
                        <button
                          type="button"
                          className="btn-outline"
                          disabled={cancelMutation.isPending}
                          onClick={() => {
                            setCancelOpen(false);
                            setCancelError('');
                          }}
                        >
                          {t('manage.cancelKeep')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => setCancelOpen(true)}
                      >
                        {t('manage.cancel')}
                      </button>
                      <Link to="/contact" className="btn-ghost btn-sm">
                        {t('manage.needHelp')}
                      </Link>
                    </div>
                  )
                ) : (
                  <div className="mt-6 rounded-2xl bg-sand/60 p-4 text-[12px] leading-relaxed text-muted">
                    <p>
                      {closed
                        ? t(`manage.closed.${booking.status}`)
                        : t('manage.cancelClosed')}
                    </p>
                    <a
                      href={HOTEL.contact.phoneHref}
                      className="link-arrow mt-3 text-forest hover:text-gold-deep"
                    >
                      {t('manage.callDesk')}
                    </a>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[24px] border border-line bg-white p-5 shadow-soft">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                {t('manage.helpTitle')}
              </p>
              <ul className="mt-4 space-y-3 text-[13px] leading-relaxed text-muted">
                {['manage.helpReview', 'manage.helpPayment', 'manage.helpCancel'].map(
                  (key) => (
                    <li key={key} className="flex gap-2.5">
                      <span
                        className="material-symbols-outlined text-[17px] text-gold-deep"
                        aria-hidden="true"
                      >
                        check
                      </span>
                      <span>{t(key)}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>

            <div className="rounded-[24px] bg-forest p-5 text-white">
              <p className="font-serif text-lg">{t('manage.needHelp')}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/70">
                {t('manage.deskHours')}
              </p>
              <a
                href={HOTEL.contact.phoneHref}
                className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-gold"
              >
                <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                  call
                </span>
                {HOTEL.contact.phoneDisplay}
              </a>
              <a
                href={`mailto:${HOTEL.contact.email}`}
                className="mt-2 flex items-center gap-2 break-all text-[12px] text-white/70 transition hover:text-gold"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  mail
                </span>
                {HOTEL.contact.email}
              </a>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
