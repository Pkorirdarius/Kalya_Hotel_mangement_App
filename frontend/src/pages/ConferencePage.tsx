import { useState, type FormEvent } from 'react';
import { usePageMeta } from '../components/Page';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '../i18n-context';
import { whatsappHref } from '../config/hotel';
import type { ConferenceEnquiry } from '../lib/api/types';
import { errorMessage, fieldErrors } from '../lib/query/errors';
import {
  useConferenceAvailability,
  useCreateConferenceEnquiryMutation,
} from '../lib/query/hooks';
import {
  conferenceEnquirySchema,
  fieldErrorKeys,
  normaliseKenyanPhone,
  splitFullName,
} from '../lib/validation';
import { addDaysISO, todayISO } from '../utils';

type Mode = 'instant' | 'quote';
type Availability = 'available' | 'limited' | 'full';

const STATUS_KEY: Record<Availability, string> = {
  available: 'availability.available',
  limited: 'availability.limited',
  full: 'availability.full',
};

const STATUS_DOT: Record<Availability, string> = {
  available: 'bg-[#1FA855]',
  limited: 'bg-gold',
  full: 'bg-red-400',
};

const SESSIONS = [
  { value: 'breakfast', labelKey: 'session.morning' },
  { value: 'half_day', labelKey: 'session.halfDay' },
  { value: 'full_day', labelKey: 'session.full' },
] as const;

const SESSION_LABELS: Record<string, string> = {
  breakfast: 'session.morning',
  half_day: 'session.halfDay',
  full_day: 'session.full',
  morning: 'session.morning',
  afternoon: 'session.afternoon',
  full: 'session.full',
};

const LAYOUTS = [
  { key: 'theatre', icon: 'event_seat' },
  { key: 'boardroom', icon: 'table_restaurant' },
  { key: 'ushape', icon: 'group_work' },
  { key: 'classroom', icon: 'school' },
] as const;

const EQUIPMENT = ['projector', 'sound', 'wifi', 'flipchart', 'water', 'host'];
const EQUIPMENT_ICONS: Record<string, string> = {
  projector: 'videocam',
  sound: 'mic',
  wifi: 'wifi',
  flipchart: 'edit_note',
  water: 'coffee',
  host: 'support_agent',
};

const CATERING = [
  { key: 'tea', price: 'KES 650' },
  { key: 'lunch', price: 'KES 1,450' },
  { key: 'full', price: 'KES 2,800' },
];

function toAvailability(value: string | undefined): Availability | null {
  if (value === 'available' || value === 'limited' || value === 'full') return value;
  return null;
}

interface Errors {
  date?: string;
  guests?: string;
  name?: string;
  email?: string;
  phone?: string;
}

/** Map API field names onto this form's field names. */
function serverErrorFields(fields: Record<string, string[]>): Errors {
  const next: Errors = {};
  const map: Record<string, keyof Errors> = {
    date: 'date',
    people: 'guests',
    first_name: 'name',
    last_name: 'name',
    email: 'email',
    phone: 'phone',
  };
  for (const [field, messages] of Object.entries(fields)) {
    const key = map[field];
    if (key && messages[0] && !next[key]) next[key] = messages[0];
  }
  return next;
}

export function ConferencePage() {
  const { t, formatDate, language } = useI18n();
  const { showToast } = useToast();
  const today = todayISO();
  const [mode, setMode] = useState<Mode>('instant');
  const [date, setDate] = useState(addDaysISO(today, 1));
  const [session, setSession] = useState<string>('breakfast');
  const [layout, setLayout] = useState<string>('theatre');
  const [guests, setGuests] = useState('20');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [catering, setCatering] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState('');
  const [enquiry, setEnquiry] = useState<ConferenceEnquiry | null>(null);

  usePageMeta(t('meta.conference.title'), t('meta.conference.description'));

  const availabilityQuery = useConferenceAvailability({ session });
  const createEnquiry = useCreateConferenceEnquiryMutation();

  const availabilityByDate = new Map(
    (availabilityQuery.data ?? []).map((row) => [row.date, toAvailability(row.status)]),
  );

  const days = Array.from({ length: 10 }, (_, index) => {
    const iso = addDaysISO(today, index);
    const value = new Date(`${iso}T12:00:00`);
    const weekday = new Intl.DateTimeFormat(language === 'sw' ? 'sw-KE' : 'en-GB', { weekday: 'short' }).format(value);
    return { iso, weekday, day: value.getDate(), status: availabilityByDate.get(iso) ?? null };
  });

  const selectedStatus = availabilityByDate.get(date) ?? null;
  const dateUnavailable = selectedStatus === 'full';

  const toggleCatering = (key: string) => {
    setCatering((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = conferenceEnquirySchema(today).safeParse({
      date,
      session,
      layout,
      people: Number(guests),
      fullName: name,
      email,
      phone,
    });

    const next: Errors = {};
    for (const [field, key] of Object.entries(fieldErrorKeys(result))) {
      const mapped = field === 'people' ? 'guests' : field === 'fullName' ? 'name' : field;
      next[mapped as keyof Errors] = t(key);
    }
    setErrors(next);
    if (!result.success) {
      const firstId = ['date', 'guests', 'name', 'email', 'phone'].find(
        (key) => next[key as keyof Errors],
      );
      if (firstId) document.getElementById(`conf-${firstId}`)?.focus();
      return;
    }
    if (dateUnavailable) {
      setErrors({ date: t('conference.dateUnavailable') });
      document.getElementById('conf-date')?.focus();
      return;
    }

    setSubmitError('');
    const { firstName, lastName } = splitFullName(name);
    try {
      const response = await createEnquiry.mutateAsync({
        date: result.data.date,
        session: result.data.session,
        people: result.data.people,
        layout: result.data.layout,
        catering,
        first_name: firstName,
        last_name: lastName,
        company: company.trim(),
        email: email.trim(),
        phone: normaliseKenyanPhone(phone),
        notes: notes.trim(),
      });
      setEnquiry(response.enquiry);
      showToast(t(mode === 'quote' ? 'toast.quoteSent' : 'toast.hallBooked'), 'success');
    } catch (error) {
      setErrors(serverErrorFields(fieldErrors(error)));
      setSubmitError(errorMessage(error, t('conference.submitError')));
    }
  };

  const handleAgain = () => {
    setEnquiry(null);
    setDate(addDaysISO(today, 1));
    setSession('breakfast');
    setLayout('theatre');
    setGuests('20');
    setName('');
    setCompany('');
    setEmail('');
    setPhone('');
    setCatering([]);
    setNotes('');
    setErrors({});
    setSubmitError('');
  };

  const fieldClass = (key: keyof Errors) =>
    `field${errors[key] ? ' border-red-500 focus:border-red-500 focus:ring-red-500/15' : ''}`;

  const enquiryCatering = Array.isArray(enquiry?.catering)
    ? enquiry.catering.filter((item): item is string => typeof item === 'string')
    : [];
  const enquirySummary = enquiry
    ? `${formatDate(enquiry.date)} · ${t(SESSION_LABELS[enquiry.session] ?? 'session.full')} · ${t(
        `layout.${enquiry.layout}`,
      )} · ${enquiry.people} ${t('common.guests')}${
        enquiryCatering.length > 0
          ? ` · ${enquiryCatering.map((item) => t(`catering.${item}`)).join(', ')}`
          : ''
      }`
    : '';

  return (
    <>
      <section className="border-b border-line bg-sand/60 py-12 md:py-16">
        <div className="container-page grid items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="eyebrow">{t('conference.eyebrow')}</p>
            <h1 className="display mt-4">{t('conference.title')}</h1>
            <p className="lede mt-5 max-w-xl">{t('conference.text')}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#book" className="btn-primary">
                {t('conference.cta')}
              </a>
              <a href="#book" className="btn-outline">
                {t('offer.meetings.cta')}
              </a>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { value: '120', label: 'conference.statGuests' },
                { value: '12×9m', label: 'conference.statSize' },
                { value: '100', label: 'conference.statWifi' },
                { value: '24/7', label: 'conference.statPower' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-white/70 p-3 ring-1 ring-line">
                  <p className="text-lg font-extrabold text-forest">{stat.value}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t(stat.label)}</p>
                </div>
              ))}
            </div>
          </div>
          <img
            src="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1400&q=85"
            alt={t('conference.heroAlt')}
            className="aspect-[5/4] w-full rounded-[28px] object-cover shadow-lift"
            fetchPriority="high"
          />
        </div>
      </section>

      <section className="container-page section">
        <div className="max-w-2xl">
          <p className="eyebrow">{t('conference.layouts.eyebrow')}</p>
          <h2 className="heading mt-3">{t('conference.layouts.title')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{t('conference.layouts.text')}</p>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LAYOUTS.map((item) => (
            <div key={item.key} className="card p-5">
              <span className="icon-tile">
                <span className="material-symbols-outlined" aria-hidden="true">
                  {item.icon}
                </span>
              </span>
              <h3 className="mt-4 text-[15px] font-bold text-forest">{t(`layout.${item.key}`)}</h3>
              <p className="mt-1 text-[12px] font-semibold text-gold-deep">{t(`layout.${item.key}.cap`)}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-muted">{t(`layout.${item.key}.desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-sand/70 py-14 md:py-16">
        <div className="container-page grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-line sm:p-8">
            <p className="eyebrow">{t('conference.included.eyebrow')}</p>
            <h2 className="heading-sm mt-3">{t('conference.included.title')}</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {EQUIPMENT.map((key) => (
                <div key={key} className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[21px] text-gold-deep" aria-hidden="true">
                    {EQUIPMENT_ICONS[key]}
                  </span>
                  <div>
                    <p className="text-[13px] font-bold text-forest">{t(`conference.equipment.${key}`)}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{t(`conference.equipment.${key}Note`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-forest p-6 text-white shadow-soft sm:p-8">
            <p className="eyebrow text-gold">{t('conference.catering.eyebrow')}</p>
            <h2 className="mt-3 font-serif text-2xl text-white">{t('conference.catering.title')}</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/65">{t('conference.catering.text')}</p>
            <div className="mt-5 space-y-3">
              {CATERING.map((item) => (
                <div
                  key={item.key}
                  className="flex items-start justify-between gap-4 rounded-2xl bg-white/[0.08] p-4 ring-1 ring-white/10"
                >
                  <div>
                    <p className="text-[13px] font-bold text-white">{t(`catering.${item.key}`)}</p>
                    <p className="mt-1 text-[11px] text-white/60">{t(`catering.${item.key}Desc`)}</p>
                  </div>
                  <p className="shrink-0 text-[13px] font-bold text-gold">{item.price}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-white/55">
              <span className="material-symbols-outlined text-[15px] text-gold" aria-hidden="true">
                info
              </span>
              <span>{t('catering.note')}</span>
            </p>
            <p className="mt-2 flex items-start gap-2 text-[11px] leading-relaxed text-gold/80">
              <span className="material-symbols-outlined text-[15px] text-gold" aria-hidden="true">
                verified
              </span>
              <span>{t('common.pricesPending')}</span>
            </p>
          </div>
        </div>
      </section>

      <section id="book" className="container-page section scroll-mt-24">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="eyebrow">{t('conference.book.eyebrow')}</p>
            <h2 className="heading mt-3">{t('conference.book.title')}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{t('conference.book.text')}</p>

            <div className="mt-6 rounded-3xl border border-line bg-white p-5 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-forest">{t('conference.calendar')}</p>
                <div className="flex items-center gap-3 text-[10px] font-semibold text-muted">
                  {(['available', 'limited', 'full'] as Availability[]).map((status) => (
                    <span key={status} className="inline-flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
                      <span>{t(STATUS_KEY[status])}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-5 gap-2">
                {days.map((day) => {
                  const selected = day.iso === date;
                  const full = day.status === 'full';
                  return (
                    <button
                      key={day.iso}
                      type="button"
                      disabled={full}
                      aria-label={`${day.weekday} ${day.day} — ${
                        day.status ? t(STATUS_KEY[day.status]) : t('availability.checking')
                      }`}
                      onClick={() => {
                        setDate(day.iso);
                        setErrors((current) => ({ ...current, date: undefined }));
                      }}
                      className={`relative flex min-h-[62px] flex-col items-center justify-center rounded-xl border p-1.5 text-center transition ${
                        selected ? 'border-forest bg-forest text-white' : 'border-line bg-cream text-forest hover:border-forest/40'
                      } ${full ? 'cursor-not-allowed opacity-45' : ''}`}
                    >
                      <span className="text-[9px] font-bold uppercase tracking-wide opacity-70">{day.weekday}</span>
                      <span className="mt-0.5 text-[16px] font-extrabold">{day.day}</span>
                      <span
                        className={`mt-1 h-1.5 w-1.5 rounded-full ${
                          selected ? 'bg-white' : day.status ? STATUS_DOT[day.status] : 'bg-line'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-muted">
                <span className="material-symbols-outlined text-[15px] text-gold-deep" aria-hidden="true">
                  schedule
                </span>
                <span>{t('conference.calendarNote')}</span>
              </p>
              {availabilityQuery.isError ? (
                <p className="mt-2 text-[11px] leading-relaxed text-muted">{t('conference.availabilityError')}</p>
              ) : null}
            </div>

            <div className="mt-5 rounded-3xl bg-gold-soft p-5">
              <p className="flex items-center gap-2 text-[12px] font-bold text-gold-deep">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  call
                </span>
                <span>{t('conference.help')}</span>
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-7">
            {!enquiry ? (
              <>
                <div className="inline-flex rounded-full bg-sand p-1" role="tablist" aria-label={t('conference.bookingType')}>
                  {(['instant', 'quote'] as Mode[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={mode === key}
                      onClick={() => setMode(key)}
                      className={`min-h-[42px] rounded-full px-4 text-[12px] font-bold transition sm:px-5 ${
                        mode === key ? 'bg-white text-forest shadow-sm' : 'text-muted hover:text-forest'
                      }`}
                    >
                      {t(key === 'instant' ? 'conference.tabInstant' : 'conference.tabQuote')}
                    </button>
                  ))}
                </div>

                <form className="mt-5 grid gap-4" noValidate onSubmit={handleSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="field-label" htmlFor="conf-date">
                        {t('conference.date')}
                      </label>
                      <input
                        id="conf-date"
                        type="date"
                        required
                        min={today}
                        value={date}
                        onChange={(event) => setDate(event.target.value < today ? today : event.target.value)}
                        className={fieldClass('date')}
                        aria-invalid={Boolean(errors.date) || dateUnavailable}
                      />
                      {errors.date ? (
                        <p className="mt-1.5 text-[12px] font-medium text-red-600">{errors.date}</p>
                      ) : dateUnavailable ? (
                        <p className="mt-1.5 text-[12px] font-medium text-red-600">
                          {t('conference.dateUnavailable')}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <label className="field-label" htmlFor="conf-session">
                        {t('conference.session')}
                      </label>
                      <select id="conf-session" value={session} onChange={(event) => setSession(event.target.value)} className="field field-select">
                        {SESSIONS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {t(item.labelKey)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="field-label" htmlFor="conf-layout">
                        {t('conference.layout')}
                      </label>
                      <select id="conf-layout" value={layout} onChange={(event) => setLayout(event.target.value)} className="field field-select">
                        {LAYOUTS.map((item) => (
                          <option key={item.key} value={item.key}>
                            {t(`layout.${item.key}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="field-label" htmlFor="conf-guests">
                        {t('conference.guests')}
                      </label>
                      <input
                        id="conf-guests"
                        type="number"
                        min={4}
                        max={120}
                        required
                        value={guests}
                        onChange={(event) => setGuests(event.target.value)}
                        className={fieldClass('guests')}
                        aria-invalid={Boolean(errors.guests)}
                      />
                      {errors.guests ? <p className="mt-1.5 text-[12px] font-medium text-red-600">{errors.guests}</p> : null}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="field-label" htmlFor="conf-name">
                        {t('conference.name')}
                      </label>
                      <input
                        id="conf-name"
                        type="text"
                        autoComplete="name"
                        required
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className={fieldClass('name')}
                        aria-invalid={Boolean(errors.name)}
                      />
                      {errors.name ? <p className="mt-1.5 text-[12px] font-medium text-red-600">{errors.name}</p> : null}
                    </div>
                    <div>
                      <label className="field-label" htmlFor="conf-company">
                        {t('conference.company')}
                      </label>
                      <input
                        id="conf-company"
                        type="text"
                        autoComplete="organization"
                        value={company}
                        onChange={(event) => setCompany(event.target.value)}
                        className="field"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="field-label" htmlFor="conf-email">
                        {t('conference.email')}
                      </label>
                      <input
                        id="conf-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className={fieldClass('email')}
                        aria-invalid={Boolean(errors.email)}
                      />
                      {errors.email ? <p className="mt-1.5 text-[12px] font-medium text-red-600">{errors.email}</p> : null}
                    </div>
                    <div>
                      <label className="field-label" htmlFor="conf-phone">
                        {t('conference.phone')}
                      </label>
                      <input
                        id="conf-phone"
                        type="tel"
                        autoComplete="tel"
                        required
                        placeholder="+254 712 345 678"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        className={fieldClass('phone')}
                        aria-invalid={Boolean(errors.phone)}
                      />
                      {errors.phone ? <p className="mt-1.5 text-[12px] font-medium text-red-600">{errors.phone}</p> : null}
                    </div>
                  </div>

                  <fieldset>
                    <legend className="field-label">{t('conference.cateringLabel')}</legend>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {CATERING.map((item) => {
                        const checked = catering.includes(item.key);
                        return (
                          <label
                            key={item.key}
                            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-[12px] transition ${
                              checked
                                ? 'border-forest bg-forest-50 font-semibold text-forest'
                                : 'border-line bg-white text-muted'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCatering(item.key)}
                              className="h-4 w-4 accent-forest"
                            />
                            <span>{t(`catering.${item.key}`)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  {mode === 'quote' ? (
                    <div>
                      <label className="field-label" htmlFor="conf-notes">
                        {t('conference.quoteLabel')}
                      </label>
                      <textarea
                        id="conf-notes"
                        rows={3}
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder={t('conference.quotePlaceholder')}
                        className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink shadow-sm transition placeholder:text-muted/60 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15"
                      />
                    </div>
                  ) : null}

                  {submitError ? (
                    <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700">
                      {submitError}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={createEnquiry.isPending || dateUnavailable}
                    className="btn-gold w-full disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span>
                      {createEnquiry.isPending
                        ? t('common.sending')
                        : t(mode === 'quote' ? 'conference.quoteSubmit' : 'conference.instantSubmit')}
                    </span>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      arrow_forward
                    </span>
                  </button>
                  <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted">
                    <span className="material-symbols-outlined text-[15px] text-forest" aria-hidden="true">
                      verified
                    </span>
                    <span>{t(mode === 'quote' ? 'conference.quoteNote' : 'conference.instantNote')}</span>
                  </p>
                </form>
              </>
            ) : (
              <div role="status">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-forest-50 text-forest">
                  <span className="material-symbols-outlined text-[30px]" aria-hidden="true">
                    check_circle
                  </span>
                </span>
                <h2 className="heading-sm mt-4">{t('conference.successTitle')}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t('conference.successText')}</p>
                <div className="mt-5 rounded-2xl bg-forest-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">{t('dining.reference')}</p>
                  <p className="mt-1 font-serif text-2xl text-forest-dark">{enquiry.reference}</p>
                  <p className="mt-2 text-[12px] font-semibold text-forest">{enquirySummary}</p>
                  <p className="mt-1 text-[11px] text-muted">{enquiry.status_display}</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" className="btn-outline btn-sm" onClick={handleAgain}>
                    {t('conference.another')}
                  </button>
                  <a
                    href={whatsappHref()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary btn-sm"
                  >
                    {t('common.whatsapp')}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
