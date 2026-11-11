import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePageMeta } from '../components/Page';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '../i18n-context';
import { whatsappHref } from '../config/hotel';
import { addDaysISO, isValidEmail, isValidKenyanPhone, todayISO } from '../utils';

type Venue = 'restaurant' | 'coffee';

const MENU_ITEMS: Record<Venue, Array<{ name: string; desc: string; price: string }>> = {
  restaurant: [
    { name: 'menu.nyama.name', desc: 'menu.nyama.desc', price: 'KES 1,850' },
    { name: 'menu.tilapia.name', desc: 'menu.tilapia.desc', price: 'KES 1,650' },
    { name: 'menu.biryani.name', desc: 'menu.biryani.desc', price: 'KES 1,250' },
    { name: 'menu.sukuma.name', desc: 'menu.sukuma.desc', price: 'KES 650' },
    { name: 'menu.chapati.name', desc: 'menu.chapati.desc', price: 'KES 1,100' },
  ],
  coffee: [
    { name: 'menu.pourover.name', desc: 'menu.pourover.desc', price: 'KES 350' },
    { name: 'menu.chai.name', desc: 'menu.chai.desc', price: 'KES 250' },
    { name: 'menu.avocado.name', desc: 'menu.avocado.desc', price: 'KES 650' },
    { name: 'menu.mandazi.name', desc: 'menu.mandazi.desc', price: 'KES 300' },
    { name: 'menu.samosa.name', desc: 'menu.samosa.desc', price: 'KES 250' },
  ],
};

const VENUES: Record<
  Venue,
  { labelKey: string; eyebrow: string; image: string; alt: string; hours: string; ext: string; note: string; noteIcon: string }
> = {
  restaurant: {
    labelKey: 'facility.restaurant.name',
    eyebrow: 'facilities.dining.eyebrow',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=85',
    alt: 'Tulia Restaurant set for dinner',
    hours: 'facility.restaurant.hours',
    ext: 'ext. 2',
    note: 'dining.vegetarian',
    noteIcon: 'eco',
  },
  coffee: {
    labelKey: 'facility.coffee.name',
    eyebrow: 'facilities.coffee.eyebrow',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1400&q=85',
    alt: 'Jacaranda Café with espresso bar and communal table',
    hours: 'facility.coffee.hours',
    ext: 'ext. 3',
    note: 'dining.workFriendly',
    noteIcon: 'wifi',
  },
};

const TIMES = ['08:00', '10:00', '12:00', '13:00', '18:00', '19:00', '20:00', '21:00'];
const PARTY_SIZES = ['1', '2', '3', '4', '5', '6', '8', '10'];
const OCCASIONS = ['meal', 'birthday', 'anniversary', 'business', 'family'];

interface Errors {
  date?: string;
  time?: string;
  name?: string;
  phone?: string;
  email?: string;
}

export function DiningPage() {
  const { t, formatDate } = useI18n();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = todayISO();
  const venue: Venue = searchParams.get('venue') === 'coffee' ? 'coffee' : 'restaurant';
  const [date, setDate] = useState(addDaysISO(today, 1));
  const [party, setParty] = useState('2');
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [occasion, setOccasion] = useState('meal');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [reference, setReference] = useState('');
  const [summary, setSummary] = useState('');

  usePageMeta(t('meta.dining.title'), t('meta.dining.description'));

  const active = VENUES[venue];

  const handleVenue = (next: Venue) => {
    setSearchParams(next === 'restaurant' ? {} : { venue: next }, { replace: true });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Errors = {};
    if (!date || date < today) next.date = t('validation.date');
    if (!time) next.time = t('validation.time');
    if (name.trim().length < 2) next.name = t('validation.name');
    if (!isValidKenyanPhone(phone.trim())) next.phone = t('validation.phone');
    if (email.trim() && !isValidEmail(email.trim())) next.email = t('validation.email');
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const firstId = ['date', 'time', 'name', 'phone', 'email'].find((key) => next[key as keyof Errors]);
      if (firstId) document.getElementById(`table-${firstId}`)?.focus();
      return;
    }

    setSending(true);
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    const ref = `TB-${Math.floor(1000 + Math.random() * 9000)}`;
    const meal = occasion === 'meal' ? '' : ` · ${t(`occasion.${occasion}`)}`;
    setReference(ref);
    setSummary(`${t(active.labelKey)} · ${formatDate(date)} · ${time} · ${party} ${t('common.guests')}${meal}`);
    setSending(false);
    showToast(t('toast.tableBooked'));
  };

  const handleAgain = () => {
    setReference('');
    setSummary('');
    setDate(addDaysISO(today, 1));
    setParty('2');
    setTime('');
    setName('');
    setPhone('');
    setEmail('');
    setOccasion('meal');
    setNotes('');
    setErrors({});
  };

  const fieldClass = (key: keyof Errors) =>
    `field${errors[key] ? ' border-red-500 focus:border-red-500 focus:ring-red-500/15' : ''}`;

  return (
    <>
      <section className="border-b border-line bg-sand/60 py-12 md:py-16">
        <div className="container-page grid items-center gap-10 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <p className="eyebrow">{t('dining.eyebrow')}</p>
            <h1 className="display mt-4">{t('dining.title')}</h1>
            <p className="lede mt-5 max-w-xl">{t('dining.text')}</p>
            <div className="mt-7 flex flex-wrap gap-2">
              <span className="pill bg-white text-forest ring-1 ring-line">
                <span className="material-symbols-outlined text-[14px] text-gold-deep" aria-hidden="true">
                  wb_sunny
                </span>
                <span>{t('dining.breakfast')}</span>
              </span>
              <span className="pill bg-white text-forest ring-1 ring-line">
                <span className="material-symbols-outlined text-[14px] text-gold-deep" aria-hidden="true">
                  restaurant
                </span>
                <span>{t('dining.walkins')}</span>
              </span>
            </div>
          </div>
          <img
            src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=85"
            alt="Tulia Restaurant dining room with warm lighting"
            className="aspect-[5/4] w-full rounded-[28px] object-cover shadow-lift"
            fetchPriority="high"
          />
        </div>
      </section>

      <section className="container-page section">
        <div className="flex justify-center">
          <div className="inline-flex rounded-full bg-white p-1 ring-1 ring-line" role="tablist" aria-label={t('dining.chooseRoom')}>
            {(Object.keys(VENUES) as Venue[]).map((key) => {
              const selected = key === venue;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`venue-panel-${key}`}
                  onClick={() => handleVenue(key)}
                  className={`min-h-[46px] rounded-full px-5 text-[12px] font-bold transition sm:px-7 ${
                    selected ? 'bg-forest text-white' : 'text-muted hover:text-forest'
                  }`}
                >
                  {t(VENUES[key].labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.02fr_1fr] lg:items-start">
          <div>
            <section id={`venue-panel-${venue}`} role="tabpanel">
              <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img src={active.image} alt={active.alt} className="h-full w-full object-cover" />
                  <span className="pill absolute left-4 top-4 bg-cream/95 text-forest">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1FA855]" />
                    <span>{t('common.openNow')}</span>
                  </span>
                </div>
                <div className="p-6">
                  <p className="eyebrow">{t(active.eyebrow)}</p>
                  <h2 className="heading-sm mt-2">{t(active.labelKey)}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t(`facility.${venue}.description`)}</p>
                  <p className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold text-forest">
                    <span className="material-symbols-outlined text-[17px] text-gold-deep" aria-hidden="true">
                      schedule
                    </span>
                    <span>{t(active.hours)}</span>
                  </p>
                  <p className="mt-2 inline-flex items-center gap-2 text-[12px] text-muted">
                    <span className="material-symbols-outlined text-[17px] text-gold-deep" aria-hidden="true">
                      call
                    </span>
                    +254 20 765 4321 · {active.ext}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-line bg-white p-6 shadow-soft">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="heading-sm text-[1.4rem]">{t('dining.menu')}</h3>
                  <span className="pill bg-gold-soft text-gold-deep">{t('dining.menuNote')}</span>
                </div>
                <div className="mt-4">
                  {MENU_ITEMS[venue].map((item, index, items) => (
                    <div key={item.name} className={index === items.length - 1 ? 'py-3' : 'border-b border-line py-3'}>
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="text-[14px] font-bold text-forest">{t(item.name)}</p>
                        <p className="shrink-0 text-[13px] font-bold text-forest">{item.price}</p>
                      </div>
                      <p className="mt-1 text-[12px] text-muted">{t(item.desc)}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 flex items-center gap-2 rounded-xl bg-forest-50 px-3 py-2 text-[11px] font-semibold text-forest">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                    {active.noteIcon}
                  </span>
                  <span>{t(active.note)}</span>
                </p>
              </div>
            </section>
          </div>

          <div className="rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-7 lg:sticky lg:top-28">
            {!reference ? (
              <>
                <p className="eyebrow">{t('dining.bookEyebrow')}</p>
                <h2 className="heading-sm mt-2">{t('dining.bookTitle')}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t('dining.bookText')}</p>

                <form className="mt-6 grid gap-4" noValidate onSubmit={handleSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="field-label" htmlFor="table-date">
                        {t('dining.date')}
                      </label>
                      <input
                        id="table-date"
                        type="date"
                        required
                        min={today}
                        value={date}
                        onChange={(event) => setDate(event.target.value < today ? today : event.target.value)}
                        className={fieldClass('date')}
                        aria-invalid={Boolean(errors.date)}
                      />
                      {errors.date ? <p className="mt-1.5 text-[12px] font-medium text-red-600">{errors.date}</p> : null}
                    </div>
                    <div>
                      <label className="field-label" htmlFor="table-party">
                        {t('dining.party')}
                      </label>
                      <select id="table-party" value={party} onChange={(event) => setParty(event.target.value)} className="field field-select">
                        {PARTY_SIZES.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <fieldset>
                    <legend className="field-label">{t('dining.time')}</legend>
                    <div className="grid grid-cols-4 gap-2">
                      {TIMES.map((slot) => (
                        <label key={slot} className="cursor-pointer">
                          <input
                            type="radio"
                            name="time"
                            value={slot}
                            checked={time === slot}
                            onChange={() => {
                              setTime(slot);
                              setErrors((current) => ({ ...current, time: undefined }));
                            }}
                            className="peer sr-only"
                          />
                          <span className="flex min-h-[44px] items-center justify-center rounded-xl border border-line bg-white text-[12px] font-semibold text-muted transition peer-checked:border-forest peer-checked:bg-forest peer-checked:text-white">
                            {slot}
                          </span>
                        </label>
                      ))}
                    </div>
                    {errors.time ? <p className="mt-1.5 text-[12px] font-medium text-red-600">{errors.time}</p> : null}
                  </fieldset>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="field-label" htmlFor="table-name">
                        {t('dining.name')}
                      </label>
                      <input
                        id="table-name"
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
                      <label className="field-label" htmlFor="table-phone">
                        {t('dining.phone')}
                      </label>
                      <input
                        id="table-phone"
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

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="field-label" htmlFor="table-email">
                        {t('dining.email')}
                      </label>
                      <input
                        id="table-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className={fieldClass('email')}
                        aria-invalid={Boolean(errors.email)}
                      />
                      {errors.email ? <p className="mt-1.5 text-[12px] font-medium text-red-600">{errors.email}</p> : null}
                    </div>
                    <div>
                      <label className="field-label" htmlFor="table-occasion">
                        {t('dining.occasion')}
                      </label>
                      <select id="table-occasion" value={occasion} onChange={(event) => setOccasion(event.target.value)} className="field field-select">
                        {OCCASIONS.map((key) => (
                          <option key={key} value={key}>
                            {t(`occasion.${key}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="field-label" htmlFor="table-notes">
                      {t('dining.notes')}
                    </label>
                    <textarea
                      id="table-notes"
                      rows={2}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder={t('dining.notesPlaceholder')}
                      className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink shadow-sm transition placeholder:text-muted/60 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15"
                    />
                  </div>

                  <button type="submit" disabled={sending} className="btn-gold w-full disabled:cursor-not-allowed disabled:opacity-70">
                    <span>{sending ? t('common.sending') : t('dining.submit')}</span>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      arrow_forward
                    </span>
                  </button>
                  <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted">
                    <span className="material-symbols-outlined text-[15px] text-forest" aria-hidden="true">
                      sms
                    </span>
                    <span>{t('dining.sms')}</span>
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
                <h2 className="heading-sm mt-4">{t('dining.successTitle')}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t('dining.successText')}</p>
                <div className="mt-5 rounded-2xl bg-forest-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">{t('dining.reference')}</p>
                  <p className="mt-1 font-serif text-2xl text-forest-dark">{reference}</p>
                  <p className="mt-2 text-[12px] font-semibold text-forest">{summary}</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" className="btn-outline btn-sm" onClick={handleAgain}>
                    {t('dining.another')}
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
