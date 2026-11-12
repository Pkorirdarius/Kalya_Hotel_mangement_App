import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { BookingSearchForm } from '../components/BookingSearchForm';
import { NewsletterForm } from '../components/NewsletterForm';
import { usePageMeta } from '../components/Page';
import { whatsappHref } from '../config/hotel';
import { useI18n } from '../i18n-context';
import { ROOMS } from '../types';

const WHY_CARDS = [
  { icon: 'sell', title: 'home.why.best.title', text: 'home.why.best.text' },
  { icon: 'event_available', title: 'home.why.cancel.title', text: 'home.why.cancel.text' },
  { icon: 'account_balance_wallet', title: 'home.why.pay.title', text: 'home.why.pay.text' },
];

const ROOM_BADGES: Record<string, { pill: string; icon: string; text: string }> = {
  'standard-executive': {
    pill: 'bg-cream/95 text-forest',
    icon: 'star',
    text: 'room.popular',
  },
  'deluxe-garden-suite': {
    pill: 'bg-gold text-forest-dark',
    icon: 'local_florist',
    text: 'room.garden',
  },
  'mara-residence': {
    pill: 'bg-cream/95 text-forest',
    icon: 'work',
    text: 'room.longStay',
  },
};

const FACILITIES = [
  {
    to: '/dining?venue=restaurant',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80',
    alt: 'home.facilities.restaurantAlt',
    icon: 'restaurant',
    name: 'facility.restaurant.name',
    description: 'facility.restaurant.description',
    hours: 'facility.restaurant.hours',
  },
  {
    to: '/dining?venue=coffee',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=80',
    alt: 'home.facilities.coffeeAlt',
    icon: 'local_cafe',
    name: 'facility.coffee.name',
    description: 'facility.coffee.description',
    hours: 'facility.coffee.hours',
  },
  {
    to: '/conference',
    image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=900&q=80',
    alt: 'home.facilities.hallAlt',
    icon: 'co_present',
    name: 'facility.conference.name',
    description: 'facility.conference.description',
    hours: 'facility.conference.hours',
  },
  {
    to: '/gym',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80',
    alt: 'home.facilities.gymAlt',
    icon: 'fitness_center',
    name: 'facility.gym.name',
    description: 'facility.gym.description',
    hours: 'facility.gym.hours',
  },
];

const OFFERS = [
  {
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=80',
    alt: 'A calm hotel bedroom prepared for a long stay',
    tag: 'offer.longStay.tag',
    tagClass: 'bg-gold text-forest-dark',
    title: 'offer.longStay.title',
    description: 'offer.longStay.description',
    price: 'offer.longStay.price',
    cta: 'offer.longStay.cta',
    href: '/booking?offer=long-stay',
  },
  {
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=900&q=80',
    alt: 'King bed in the Deluxe Garden Suite',
    tag: 'offer.ngo.tag',
    tagClass: 'bg-cream text-forest',
    title: 'offer.ngo.title',
    description: 'offer.ngo.description',
    price: 'offer.ngo.price',
    cta: 'offer.ngo.cta',
    href: '/booking?offer=ngo',
  },
  {
    image: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=900&q=80',
    alt: 'Sunday brunch spread with fresh fruit and pastries',
    tag: 'offer.brunch.tag',
    tagClass: 'bg-gold text-forest-dark',
    title: 'offer.brunch.title',
    description: 'offer.brunch.description',
    price: 'offer.brunch.price',
    cta: 'offer.brunch.cta',
    href: '/dining?venue=restaurant',
  },
  {
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=900&q=80',
    alt: 'Conference delegates at a workshop in Kilele Hall',
    tag: 'offer.meetings.tag',
    tagClass: 'bg-cream text-forest',
    title: 'offer.meetings.title',
    description: 'offer.meetings.description',
    price: 'offer.meetings.price',
    cta: 'offer.meetings.cta',
    href: '/conference#quote',
  },
];

const REVIEWS = [
  {
    quote: 'review.wanjiku.quote',
    name: 'review.wanjiku.name',
    role: 'review.wanjiku.role',
  },
  {
    quote: 'review.daniel.quote',
    name: 'review.daniel.name',
    role: 'review.daniel.role',
  },
  {
    quote: 'review.amina.quote',
    name: 'review.amina.name',
    role: 'review.amina.role',
  },
];

function GoogleLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.55-5.17 3.55-8.87Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.09A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.26a12 12 0 0 0 0 10.76l4.01-3.09Z" />
      <path fill="#EA4335" d="M12 4.76c1.76 0 3.34.6 4.58 1.79l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.26 6.62l4.01 3.09C6.22 6.87 8.87 4.76 12 4.76Z" />
    </svg>
  );
}

function Stars({ size = 15, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`flex text-gold-deep ${className}`} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((star) => (
        <span key={star} className="material-symbols-outlined" style={{ fontSize: size }} data-fill="1">
          star
        </span>
      ))}
    </span>
  );
}

export function HomePage() {
  const { t, formatMoney } = useI18n();
  usePageMeta(t('meta.home.title'), t('meta.home.description'));

  const carouselRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const scrollCarousel = (direction: 1 | -1) => {
    const track = carouselRef.current;
    if (!track) return;
    const first = track.querySelector<HTMLElement>('article');
    const step = first ? first.getBoundingClientRect().width + 20 : track.clientWidth;
    track.scrollBy({ left: step * direction, behavior: 'smooth' });
  };

  const updateCarouselButtons = () => {
    const track = carouselRef.current;
    if (!track) return;
    if (prevRef.current) {
      prevRef.current.disabled = track.scrollLeft <= 4;
    }
    if (nextRef.current) {
      nextRef.current.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    }
  };

  return (
    <>
      <section className="relative isolate overflow-hidden bg-forest-dark pb-32 pt-16 text-white md:pb-40 md:pt-24">
        <img
          src="https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=2000&q=85"
          alt={t('home.hero.imageAlt')}
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-forest-dark/80 via-forest-dark/45 to-forest-dark/90" />
        <div className="container-page relative animate-fade-up">
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-gold" />
            <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-gold">
              {t('home.hero.eyebrow')}
            </p>
          </div>

          <h1 className="mt-6 max-w-3xl font-serif text-[2.9rem] font-medium leading-[1.02] tracking-tight text-balance text-white sm:text-6xl lg:text-7xl">
            {t('home.hero.title')}
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
            {t('home.hero.text')}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <GoogleLogo />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-xl leading-none">4.8</span>
                  <Stars size={15} className="text-gold" />
                </div>
                <p className="mt-1 text-[11px] text-white/65">{t('home.hero.ratingLabel')}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-white/75">
              <span className="inline-flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-gold" aria-hidden="true">
                  schedule
                </span>
                <span>{t('home.hero.frontDesk')}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-gold" aria-hidden="true">
                  local_parking
                </span>
                <span>{t('home.hero.parking')}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <BookingSearchForm />

      <section className="section pt-14 md:pt-20">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <div>
              <p className="eyebrow">{t('home.why.eyebrow')}</p>
              <h2 className="heading mt-4">{t('home.why.title')}</h2>
            </div>
            <p className="lede max-w-2xl lg:justify-self-end">{t('home.why.text')}</p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {WHY_CARDS.map((card) => (
              <article key={card.title} className="card-flat flex flex-col gap-4 p-6">
                <span className="icon-tile">
                  <span className="material-symbols-outlined text-[24px]" aria-hidden="true">
                    {card.icon}
                  </span>
                </span>
                <div>
                  <h3 className="heading-sm text-[1.45rem]">{t(card.title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t(card.text)}</p>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-6 flex items-start gap-2 rounded-2xl bg-gold-pale px-4 py-3 text-[13px] font-medium text-gold-deep">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              local_bar
            </span>
            <span>{t('home.why.note')}</span>
          </p>
        </div>
      </section>

      <section className="section bg-sand/60">
        <div className="container-page">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow">{t('home.rooms.eyebrow')}</p>
              <h2 className="heading mt-4">{t('home.rooms.title')}</h2>
              <p className="lede mt-4">{t('home.rooms.text')}</p>
            </div>
            <Link to="/rooms" className="link-arrow shrink-0">
              <span>{t('home.rooms.link')}</span>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {ROOMS.map((room) => {
              const badge = ROOM_BADGES[room.id];
              const prefix = room.nameKey.replace('.name', '');
              return (
                <article
                  key={room.id}
                  className="group card overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-lift"
                >
                  <Link to={`/rooms#${room.id}`} className="block">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={room.image}
                        alt={t(room.nameKey)}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                      {badge ? (
                        <span className={`pill absolute left-4 top-4 ${badge.pill}`}>
                          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                            {badge.icon}
                          </span>
                          <span>{t(badge.text)}</span>
                        </span>
                      ) : null}
                      <span className="absolute bottom-4 right-4 rounded-full bg-forest/95 px-3.5 py-2 text-[12px] font-bold text-white backdrop-blur">
                        {t('common.from')} KES {formatMoney(room.price)}
                        <span className="ml-1 font-medium text-white/70">{t('common.perNight')}</span>
                      </span>
                    </div>
                    <div className="p-6">
                      <p className="eyebrow">{t(`${prefix}.tagline`)}</p>
                      <h3 className="heading-sm mt-2">{t(room.nameKey)}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        {t(`${prefix}.description`)}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-semibold text-forest">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-gold-deep" aria-hidden="true">
                            group
                          </span>
                          <span>{t(`room.sleeps${room.sleeps}`)}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-gold-deep" aria-hidden="true">
                            square_foot
                          </span>
                          {room.size} m²
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-gold-deep" aria-hidden="true">
                            bed
                          </span>
                          <span>{t(room.bedKey)}</span>
                        </span>
                      </div>
                      <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gold-deep">
                          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                            event_available
                          </span>
                          <span>{t('common.freeCancellation')}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-[13px] font-bold text-forest">
                          <span>{t('common.viewRooms')}</span>
                          <span
                            className="material-symbols-outlined text-[17px] transition group-hover:translate-x-0.5"
                            aria-hidden="true"
                          >
                            arrow_forward
                          </span>
                        </span>
                      </div>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-page">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow">{t('home.facilities.eyebrow')}</p>
              <h2 className="heading mt-4">{t('home.facilities.title')}</h2>
              <p className="lede mt-4">{t('home.facilities.text')}</p>
            </div>
            <Link to="/facilities" className="link-arrow shrink-0">
              <span>{t('nav.facilities')}</span>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FACILITIES.map((facility) => (
              <Link
                key={facility.name}
                to={facility.to}
                className="group relative overflow-hidden rounded-3xl bg-forest-dark shadow-soft"
              >
                <img
                  src={facility.image}
                  alt={t(facility.alt)}
                  className="aspect-[4/5] w-full object-cover opacity-85 transition duration-700 group-hover:scale-105 group-hover:opacity-100"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forest-dark via-forest-dark/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <span className="material-symbols-outlined text-[22px] text-gold" aria-hidden="true">
                    {facility.icon}
                  </span>
                  <h3 className="mt-2 font-serif text-2xl">{t(facility.name)}</h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-white/70">
                    {t(facility.description)}
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-gold">
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                      schedule
                    </span>
                    <span>{t(facility.hours)}</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section overflow-hidden bg-forest text-white">
        <div className="container-page">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-gold">
                {t('home.offers.eyebrow')}
              </p>
              <h2 className="mt-4 font-serif text-3xl font-medium tracking-tight text-white sm:text-4xl">
                {t('home.offers.title')}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/65">{t('home.offers.text')}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                ref={prevRef}
                type="button"
                onClick={() => scrollCarousel(-1)}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/10 disabled:opacity-30"
                aria-label={t('offers.prev')}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_back
                </span>
              </button>
              <button
                ref={nextRef}
                type="button"
                onClick={() => scrollCarousel(1)}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/10 disabled:opacity-30"
                aria-label={t('offers.next')}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>

          <div
            ref={carouselRef}
            onScroll={updateCarouselButtons}
            className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2"
            tabIndex={0}
            aria-label={t('offers.current')}
          >
            {OFFERS.map((offer) => (
              <article
                key={offer.title}
                className="w-[86%] min-w-[86%] overflow-hidden rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur sm:w-[400px] sm:min-w-[400px]"
              >
                <div className="relative h-52 overflow-hidden">
                  <img src={offer.image} alt={offer.alt} className="h-full w-full object-cover" loading="lazy" />
                  <span className={`pill absolute left-4 top-4 ${offer.tagClass}`}>{t(offer.tag)}</span>
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-2xl text-white">{t(offer.title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{t(offer.description)}</p>
                  <p className="mt-4 text-sm font-bold text-gold">{t(offer.price)}</p>
                  <Link to={offer.href} className="btn-gold btn-sm mt-5 w-full">
                    {t(offer.cta)}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-sand/70">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="eyebrow">{t('home.reviews.eyebrow')}</p>
              <h2 className="heading mt-4">{t('home.reviews.title')}</h2>

              <div className="card-flat mt-8 inline-flex flex-col gap-3 p-5">
                <div className="flex items-center gap-4">
                  <GoogleLogo />
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-4xl leading-none text-forest-dark">
                        {t('home.reviews.rating')}
                      </span>
                      <span className="text-sm font-semibold text-muted">/ 5</span>
                    </div>
                    <Stars size={17} className="mt-1" />
                  </div>
                </div>
                <p className="text-[13px] font-semibold text-muted">{t('home.reviews.count')}</p>
                <a
                  href="https://www.google.com/search?q=West+Premier+Hotel+Westlands+Kapenguria+reviews"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-arrow text-[13px]"
                >
                  <span>{t('home.reviews.link')}</span>
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                    open_in_new
                  </span>
                </a>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {REVIEWS.map((review) => (
                <figure key={review.name} className="card-flat flex h-full flex-col p-5">
                  <Stars size={15} />
                  <blockquote className="mt-4 flex-1 text-[13px] leading-relaxed text-ink/85">
                    {t(review.quote)}
                  </blockquote>
                  <figcaption className="mt-5 border-t border-line pt-4">
                    <p className="text-[13px] font-bold text-forest">{t(review.name)}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{t(review.role)}</p>
                    <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted/70">
                      <span className="material-symbols-outlined text-[13px] text-forest" aria-hidden="true">
                        verified
                      </span>
                      <span>{t('home.reviews.verified')}</span>
                    </p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-forest-dark text-white">
        <div className="container-page">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-gold">
                {t('newsletter.eyebrow')}
              </p>
              <h2 className="mt-4 font-serif text-3xl font-medium tracking-tight text-white sm:text-4xl">
                {t('newsletter.title')}
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/65">
                {t('newsletter.text')}
              </p>
              <p className="mt-6 inline-flex items-center gap-2 text-[12px] text-white/50">
                <span className="material-symbols-outlined text-[17px] text-gold" aria-hidden="true">
                  mark_email_unread
                </span>
                <span>{t('newsletter.privacy')}</span>
              </p>
            </div>
            <NewsletterForm />
          </div>
        </div>
      </section>

      <section className="bg-cream py-14">
        <div className="container-page">
          <div className="flex flex-col items-start justify-between gap-5 rounded-3xl border border-line bg-white p-6 shadow-soft sm:flex-row sm:items-center sm:p-8">
            <div>
              <h2 className="heading-sm">{t('rooms.help.title')}</h2>
              <p className="mt-2 max-w-xl text-sm text-muted">{t('rooms.help.text')}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/contact" className="btn-outline btn-sm">
                {t('rooms.help.cta')}
              </Link>
              <a
                href={whatsappHref()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary btn-sm"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  chat
                </span>
                <span>{t('common.whatsapp')}</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
