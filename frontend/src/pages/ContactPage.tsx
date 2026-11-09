import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePageMeta } from '../components/Page';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '../i18n-context';
import {
  ADDRESS,
  EMAIL,
  EMAIL_HREF,
  MAP_LINK,
  MAP_QUERY,
  PHONE,
  PHONE_HREF,
  WHATSAPP_NUMBER,
} from '../lib/constants';
import { isValidEmail, isValidKenyanPhone } from '../utils';

const TOPICS = ['general', 'booking', 'dining', 'conference', 'gym', 'group'];

const CONTACT_CARDS = [
  { key: 'contact.callUs', value: PHONE, href: PHONE_HREF, icon: 'call' },
  { key: 'contact.whatsapp', value: '+254 712 345 678', href: `https://wa.me/${WHATSAPP_NUMBER}`, icon: 'chat', external: true },
  { key: 'contact.emailLabel', value: EMAIL, href: EMAIL_HREF, icon: 'mail' },
  { key: 'contact.visit', value: '12 Jacaranda Lane, Westlands', href: MAP_LINK, icon: 'location_on', external: true },
];

const HOURS = [
  { key: 'contact.hours.frontDesk', valueKey: 'contact.hours.open24' },
  { key: 'facility.restaurant.name', value: '6:30am – 10:00pm' },
  { key: 'facility.coffee.name', value: '7:00am – 8:00pm' },
  { key: 'facility.gym.name', value: '5:30am – 10:00pm' },
];

interface Errors {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
}

export function ContactPage() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const requested = searchParams.get('topic') ?? 'general';
  const initialTopic = requested === 'membership' || requested === 'classes' ? 'gym' : TOPICS.includes(requested) ? requested : 'general';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState(initialTopic);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState('');

  usePageMeta(
    'Contact — West Premier Hotel, Kapenguria',
    'Contact West Premier Hotel in Westlands, Kapenguria. Call, WhatsApp or email the 24-hour front desk for stays, dining, conferences and gym membership.',
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Errors = {};
    if (name.trim().length < 2) next.name = t('validation.name');
    if (!isValidEmail(email.trim())) next.email = t('validation.email');
    if (phone.trim() && !isValidKenyanPhone(phone.trim())) next.phone = t('validation.phone');
    if (message.trim().length < 10) next.message = t('validation.message');
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const firstId = ['name', 'email', 'phone', 'message'].find((key) => next[key as keyof Errors]);
      if (firstId) document.getElementById(`contact-${firstId}`)?.focus();
      return;
    }

    setSending(true);
    await new Promise((resolve) => window.setTimeout(resolve, 800));
    setSummary(`${t(`topic.${topic}`)} · ${email.trim()}`);
    setSending(false);
    showToast(t('toast.formSent'));
  };

  const handleAgain = () => {
    setSummary('');
    setName('');
    setEmail('');
    setPhone('');
    setTopic('general');
    setMessage('');
    setErrors({});
  };

  const fieldClass = (key: keyof Errors) =>
    `field${errors[key] ? ' border-red-500 focus:border-red-500 focus:ring-red-500/15' : ''}`;

  return (
    <>
      <section className="border-b border-line bg-sand/60 py-12 md:py-16">
        <div className="container-page grid items-start gap-10 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="eyebrow">{t('contact.eyebrow')}</p>
            <h1 className="display mt-4">{t('contact.title')}</h1>
            <p className="lede mt-5 max-w-xl">{t('contact.text')}</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {CONTACT_CARDS.map((card) => (
                <a
                  key={card.key}
                  href={card.href}
                  {...(card.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 transition hover:border-forest/30 hover:shadow-soft"
                >
                  <span
                    className={`icon-tile h-10 w-10 rounded-xl ${
                      card.icon === 'chat' ? 'bg-[#1FA855]/10 text-[#1FA855]' : ''
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                      {card.icon}
                    </span>
                  </span>
                  <span>
                    <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                      {t(card.key)}
                    </span>
                    <span className="mt-0.5 block text-[13px] font-bold text-forest">{card.value}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>
          <img
            src="https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1400&q=85"
            alt="The warm lobby lounge at West Premier Hotel"
            className="aspect-[5/4] w-full rounded-[28px] object-cover shadow-lift"
            fetchPriority="high"
          />
        </div>
      </section>

      <section className="container-page section">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-7">
            {!summary ? (
              <>
                <p className="eyebrow">{t('contact.form.eyebrow')}</p>
                <h2 className="heading-sm mt-2">{t('contact.form.title')}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t('contact.form.text')}</p>

                <form className="mt-6 grid gap-4" noValidate onSubmit={handleSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="field-label" htmlFor="contact-name">
                        {t('contact.name')}
                      </label>
                      <input
                        id="contact-name"
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
                      <label className="field-label" htmlFor="contact-email">
                        {t('contact.emailLabel')}
                      </label>
                      <input
                        id="contact-email"
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
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="field-label" htmlFor="contact-phone">
                        {t('contact.phone')}
                      </label>
                      <input
                        id="contact-phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="+254 712 345 678"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        className={fieldClass('phone')}
                        aria-invalid={Boolean(errors.phone)}
                      />
                      {errors.phone ? <p className="mt-1.5 text-[12px] font-medium text-red-600">{errors.phone}</p> : null}
                    </div>
                    <div>
                      <label className="field-label" htmlFor="contact-topic">
                        {t('contact.topic')}
                      </label>
                      <select id="contact-topic" value={topic} onChange={(event) => setTopic(event.target.value)} className="field field-select">
                        {TOPICS.map((key) => (
                          <option key={key} value={key}>
                            {t(`topic.${key}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="field-label" htmlFor="contact-message">
                      {t('contact.message')}
                    </label>
                    <textarea
                      id="contact-message"
                      rows={5}
                      required
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder={t('contact.messagePlaceholder')}
                      className={`w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-ink shadow-sm transition placeholder:text-muted/60 focus:outline-none focus:ring-2 ${
                        errors.message
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15'
                          : 'border-line focus:border-forest focus:ring-forest/15'
                      }`}
                      aria-invalid={Boolean(errors.message)}
                    />
                    {errors.message ? <p className="mt-1.5 text-[12px] font-medium text-red-600">{errors.message}</p> : null}
                  </div>

                  <button type="submit" disabled={sending} className="btn-gold w-full disabled:cursor-not-allowed disabled:opacity-70">
                    <span>{sending ? t('common.sending') : t('contact.submit')}</span>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      arrow_forward
                    </span>
                  </button>
                  <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted">
                    <span className="material-symbols-outlined text-[15px] text-forest" aria-hidden="true">
                      schedule
                    </span>
                    <span>{t('contact.response')}</span>
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
                <h2 className="heading-sm mt-4">{t('contact.successTitle')}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t('contact.successText')}</p>
                <div className="mt-5 rounded-2xl bg-forest-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">{t('contact.topicLabel')}</p>
                  <p className="mt-1 text-[13px] font-bold text-forest">{summary}</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" className="btn-outline btn-sm" onClick={handleAgain}>
                    {t('contact.another')}
                  </button>
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}`}
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

          <div className="grid gap-5">
            <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
              <iframe
                src={`https://www.google.com/maps?q=${MAP_QUERY}&output=embed`}
                title={t('contact.mapTitle')}
                className="h-64 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              <div className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{t('contact.details.title')}</p>
                  <p className="mt-1 text-[13px] font-bold text-forest">{ADDRESS}</p>
                </div>
                <a
                  href={MAP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline btn-sm shrink-0"
                >
                  {t('contact.directions')}
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-line bg-white p-5 shadow-soft">
              <p className="eyebrow">{t('contact.hours.title')}</p>
              <dl className="mt-4 space-y-3 text-[13px]">
                {HOURS.map((item, index) => (
                  <div
                    key={item.key}
                    className={`flex items-center justify-between gap-4 ${
                      index === HOURS.length - 1 ? '' : 'border-b border-line pb-3'
                    }`}
                  >
                    <dt className="font-semibold text-ink">{t(item.key)}</dt>
                    <dd className="font-bold text-forest">{item.valueKey ? t(item.valueKey) : item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-3xl bg-forest p-5 text-white">
              <p className="flex items-center gap-2 text-[12px] font-bold text-gold">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  directions_car
                </span>
                <span>{t('contact.getting.title')}</span>
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-white/65">{t('contact.getting.text')}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="pill bg-white/10 text-white ring-1 ring-white/15">
                  <span className="material-symbols-outlined text-[14px] text-gold" aria-hidden="true">
                    local_parking
                  </span>
                  <span>{t('contact.parking')}</span>
                </span>
                <span className="pill bg-white/10 text-white ring-1 ring-white/15">
                  <span className="material-symbols-outlined text-[14px] text-gold" aria-hidden="true">
                    airport_shuttle
                  </span>
                  <span>{t('contact.transfer')}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
