import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../components/Page';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '../i18n-context';
import { isValidKenyanPhone, todayISO } from '../utils';

const EQUIPMENT = [
  { key: 'cardio', icon: 'directions_run' },
  { key: 'strength', icon: 'weight' },
  { key: 'functional', icon: 'sports_martial_arts' },
  { key: 'changing', icon: 'lock' },
];

const PLANS = [
  { key: 'day', price: 'KES 1,000', includes: ['access', 'locker', 'orientation'], cta: 'gym.bookDayPass', popular: false },
  { key: 'monthly', price: 'KES 6,500', includes: ['unlimited', 'classes', 'guest'], cta: 'gym.joinMonthly', popular: true },
  { key: 'quarterly', price: 'KES 17,500', includes: ['unlimited', 'classes', 'programme'], cta: 'plan.choose', popular: false },
  { key: 'annual', price: 'KES 55,000', includes: ['unlimited', 'classes', 'priority'], cta: 'plan.choose', popular: false },
];

const HOURS = [
  { key: 'gym.hours.weekdays', value: '5:30am – 10:00pm' },
  { key: 'gym.hours.saturday', value: '7:00am – 8:00pm' },
  { key: 'gym.hours.sunday', value: '8:00am – 6:00pm' },
  { key: 'gym.hours.holidays', value: '8:00am – 6:00pm' },
];

const CLASSES = [
  { key: 'yoga', icon: 'self_improvement' },
  { key: 'spin', icon: 'directions_bike' },
  { key: 'strength', icon: 'fitness_center' },
];

interface Errors {
  name?: string;
  phone?: string;
  date?: string;
}

export function GymPage() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const today = todayISO();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState(today);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);

  usePageMeta(t('meta.gym.title'), t('meta.gym.description'));

  const openDialog = () => {
    setErrors({});
    if (!date || date < today) setDate(today);
    dialogRef.current?.showModal();
    window.setTimeout(() => nameRef.current?.focus(), 80);
  };

  const closeDialog = () => dialogRef.current?.close();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Errors = {};
    if (name.trim().length < 2) next.name = t('validation.name');
    if (!isValidKenyanPhone(phone.trim())) next.phone = t('validation.phone');
    if (!date || date < today) next.date = t('validation.date');
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const firstId = ['name', 'phone', 'date'].find((key) => next[key as keyof Errors]);
      if (firstId) document.getElementById(`gym-${firstId}`)?.focus();
      return;
    }

    setSending(true);
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    setSending(false);
    closeDialog();
    showToast(t('toast.dayPass'));
    setName('');
    setPhone('');
    setDate(today);
  };

  const fieldClass = (key: keyof Errors) =>
    `field${errors[key] ? ' border-red-500 focus:border-red-500 focus:ring-red-500/15' : ''}`;

  return (
    <>
      <section className="border-b border-line bg-forest text-white">
        <div className="container-page grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold">{t('gym.eyebrow')}</p>
            <h1 className="mt-4 font-serif text-[2.6rem] leading-[1.02] tracking-tight text-white sm:text-6xl">
              {t('gym.title')}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/65">{t('gym.text')}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" className="btn-gold" onClick={openDialog}>
                <span>{t('gym.bookDayPass')}</span>
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  arrow_forward
                </span>
              </button>
              <a href="#membership" className="btn-light">
                {t('gym.viewMembership')}
              </a>
            </div>
            <div className="mt-7 flex flex-wrap gap-2">
              {[
                { icon: 'schedule', key: 'gym.openEarly' },
                { icon: 'shower', key: 'gym.showers' },
                { icon: 'fitness_center', key: 'gym.dayFrom' },
              ].map((item) => (
                <span key={item.key} className="pill bg-white/10 text-white ring-1 ring-white/15">
                  <span className="material-symbols-outlined text-[14px] text-gold" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{t(item.key)}</span>
                </span>
              ))}
            </div>
          </div>
          <img
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=85"
            alt={t('gym.heroAlt')}
            className="aspect-[5/4] w-full rounded-[28px] object-cover shadow-lift"
            fetchPriority="high"
          />
        </div>
      </section>

      <section className="bg-sand/70 py-10">
        <div className="container-page grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {EQUIPMENT.map((item) => (
            <div key={item.key} className="flex items-start gap-3">
              <span className="icon-tile h-10 w-10 rounded-xl bg-white">
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  {item.icon}
                </span>
              </span>
              <div>
                <p className="text-[13px] font-bold text-forest">{t(`gym.equipment.${item.key}`)}</p>
                <p className="mt-0.5 text-[11px] text-muted">{t(`gym.equipment.${item.key}Text`)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="membership" className="container-page section scroll-mt-24">
        <div className="max-w-2xl">
          <p className="eyebrow">{t('gym.pricing.eyebrow')}</p>
          <h2 className="heading mt-3">{t('gym.pricing.title')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{t('gym.pricing.text')}</p>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <article
              key={plan.key}
              className={`relative flex flex-col rounded-3xl bg-white p-5 ${
                plan.popular ? 'border-2 border-forest shadow-lift' : 'border border-line shadow-soft'
              }`}
            >
              {plan.popular ? (
                <span className="pill absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-forest-dark">
                  {t('plan.popular')}
                </span>
              ) : null}
              <p
                className={`text-[11px] font-bold uppercase tracking-[0.18em] ${
                  plan.popular ? 'text-forest' : 'text-muted'
                }`}
              >
                {t(`plan.${plan.key}`)}
              </p>
              <p className="mt-3 font-serif text-4xl text-forest-dark">{plan.price}</p>
              <p className="mt-1 text-[11px] font-medium text-muted">{t(`plan.${plan.key}.period`)}</p>
              <p className="mt-4 text-[12px] leading-relaxed text-muted">{t(`plan.${plan.key}.desc`)}</p>
              <ul className="mt-4 space-y-2 text-[12px] text-ink">
                {plan.includes.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-forest" aria-hidden="true">
                      check
                    </span>
                    <span>{t(`plan.include.${item}`)}</span>
                  </li>
                ))}
              </ul>
              {plan.key === 'day' ? (
                <button type="button" className="btn-outline mt-5 w-full" onClick={openDialog}>
                  {t(plan.cta)}
                </button>
              ) : (
                <Link
                  to="/contact?topic=membership"
                  className={`${plan.popular ? 'btn-primary' : 'btn-outline'} mt-5 w-full`}
                >
                  {t(plan.cta)}
                </Link>
              )}
            </article>
          ))}
        </div>

        <p className="mt-5 flex items-center gap-2 text-[12px] text-muted">
          <span className="material-symbols-outlined text-[17px] text-gold-deep" aria-hidden="true">
            badge
          </span>
          <span>{t('gym.corporate')}</span>
        </p>
      </section>

      <section className="bg-sand/70 py-14 md:py-16">
        <div className="container-page grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-line">
            <p className="eyebrow">{t('gym.hours.eyebrow')}</p>
            <h2 className="heading-sm mt-3">{t('gym.hours.title')}</h2>
            <dl className="mt-5 space-y-3 text-[13px]">
              {HOURS.map((item, index) => (
                <div
                  key={item.key}
                  className={`flex items-center justify-between gap-4 ${
                    index === HOURS.length - 1 ? '' : 'border-b border-line pb-3'
                  }`}
                >
                  <dt className="font-semibold text-ink">{t(item.key)}</dt>
                  <dd className="font-bold text-forest">{item.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 flex items-start gap-2 text-[11px] leading-relaxed text-muted">
              <span className="material-symbols-outlined text-[16px] text-gold-deep" aria-hidden="true">
                info
              </span>
              <span>{t('gym.hours.note')}</span>
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-line">
            <p className="eyebrow">{t('gym.classes.eyebrow')}</p>
            <h2 className="heading-sm mt-3">{t('gym.classes.title')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t('gym.classes.text')}</p>
            <div className="mt-5 grid gap-3">
              {CLASSES.map((item) => (
                <div key={item.key} className="flex items-center gap-3 rounded-2xl bg-cream p-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest">
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                      {item.icon}
                    </span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-forest">{t(`class.${item.key}`)}</p>
                    <p className="text-[11px] text-muted">{t(`class.${item.key}Time`)}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/contact?topic=classes" className="link-arrow mt-5 text-[13px]">
              <span>{t('gym.classes.cta')}</span>
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </div>
      </section>

      <dialog
        ref={dialogRef}
        className="w-[min(92vw,480px)] rounded-3xl border border-line bg-cream p-0 text-ink shadow-lift backdrop:bg-forest-dark/60 backdrop:backdrop-blur-sm"
        onClick={(event) => {
          if (event.target === dialogRef.current) closeDialog();
        }}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="eyebrow">{t('gym.eyebrow')}</p>
            <h2 className="heading-sm mt-1 text-[1.45rem]">{t('gym.dialog.title')}</h2>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-forest transition hover:border-forest/30"
            aria-label={t('common.close')}
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              close
            </span>
          </button>
        </div>
        <form className="grid gap-4 p-5" noValidate onSubmit={handleSubmit}>
          <p className="text-[13px] leading-relaxed text-muted">{t('gym.dialog.text')}</p>
          <div>
            <label className="field-label" htmlFor="gym-name">
              {t('gym.dialog.name')}
            </label>
            <input
              ref={nameRef}
              id="gym-name"
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
            <label className="field-label" htmlFor="gym-phone">
              {t('gym.dialog.phone')}
            </label>
            <input
              id="gym-phone"
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
          <div>
            <label className="field-label" htmlFor="gym-date">
              {t('gym.dialog.date')}
            </label>
            <input
              id="gym-date"
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
          <button type="submit" disabled={sending} className="btn-gold w-full disabled:cursor-not-allowed disabled:opacity-70">
            <span>{sending ? t('common.sending') : t('gym.dialog.submit')}</span>
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              arrow_forward
            </span>
          </button>
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted">
            <span className="material-symbols-outlined text-[15px] text-forest" aria-hidden="true">
              payments
            </span>
            <span>{t('gym.dialog.note')}</span>
          </p>
        </form>
      </dialog>
    </>
  );
}
