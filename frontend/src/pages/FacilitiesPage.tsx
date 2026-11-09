import { Link } from 'react-router-dom';
import { usePageMeta } from '../components/Page';
import { useI18n } from '../i18n-context';
import { WHATSAPP_NUMBER } from '../lib/constants';

const FACILITIES = [
  {
    to: '/dining?venue=restaurant',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=85',
    alt: 'Tulia Restaurant dining room with warm lighting and set tables',
    pillClass: 'bg-cream/95 text-forest',
    pillIcon: 'dot',
    pillKey: 'common.openNow',
    eyebrow: 'facilities.dining.eyebrow',
    name: 'facility.restaurant.name',
    description: 'facility.restaurant.description',
    hours: 'facility.restaurant.hours',
    icon: 'restaurant',
    primary: { to: '/dining?venue=restaurant', label: 'common.bookTable' },
    secondary: { to: '/dining?venue=restaurant', label: 'facilities.viewMenu' },
  },
  {
    to: '/dining?venue=coffee',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1400&q=85',
    alt: 'Jacaranda Café with espresso bar and communal table',
    pillClass: 'bg-cream/95 text-forest',
    pillIcon: 'dot',
    pillKey: 'common.openNow',
    eyebrow: 'facilities.coffee.eyebrow',
    name: 'facility.coffee.name',
    description: 'facility.coffee.description',
    hours: 'facility.coffee.hours',
    icon: 'local_cafe',
    primary: { to: '/dining?venue=coffee', label: 'common.bookTable' },
    secondary: { to: '/dining?venue=coffee', label: 'facilities.viewMenu' },
  },
  {
    to: '/conference',
    image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1400&q=85',
    alt: 'Kilele Hall set for a conference with rows of chairs',
    pillClass: 'bg-gold text-forest-dark',
    pillIcon: 'co_present',
    pillKey: 'facilities.upTo120',
    eyebrow: 'facilities.conference.eyebrow',
    name: 'facility.conference.name',
    description: 'facility.conference.description',
    hours: 'facility.conference.hours',
    icon: 'co_present',
    primary: { to: '/conference', label: 'facilities.checkHall' },
    secondary: { to: '/conference#quote', label: 'offer.meetings.cta' },
  },
  {
    to: '/gym',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=85',
    alt: 'West Premier Fitness gym with cardio equipment and free weights',
    pillClass: 'bg-cream/95 text-forest',
    pillIcon: 'fitness_center',
    pillKey: 'facilities.dayPassFrom',
    eyebrow: 'facilities.gym.eyebrow',
    name: 'facility.gym.name',
    description: 'facility.gym.description',
    hours: 'facility.gym.hours',
    icon: 'fitness_center',
    primary: { to: '/gym', label: 'facilities.buyPass' },
    secondary: { to: '/gym', label: 'facilities.membership' },
  },
];

const EXTRAS = [
  { icon: 'bolt', title: 'facilities.generator', text: 'facilities.generator.text' },
  { icon: 'local_parking', title: 'facilities.parking', text: 'facilities.parking.text' },
  { icon: 'accessible', title: 'facilities.accessible', text: 'facilities.accessible.text' },
  { icon: 'airport_shuttle', title: 'facilities.transfers', text: 'facilities.transfers.text' },
];

export function FacilitiesPage() {
  const { t } = useI18n();
  usePageMeta(
    'Facilities — West Premier Hotel, Kapenguria',
    'Restaurant, coffee shop, conference hall and gym at West Premier Hotel in Westlands, Kapenguria. Open to hotel guests and local residents.',
  );

  return (
    <>
      <section className="border-b border-line bg-sand/60 py-14 md:py-20">
        <div className="container-page grid items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="eyebrow">{t('home.facilities.eyebrow')}</p>
            <h1 className="display mt-4">{t('facilities.title')}</h1>
            <p className="lede mt-5 max-w-xl">{t('facilities.text')}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/dining" className="btn-primary">
                {t('common.bookTable')}
              </Link>
              <Link to="/conference" className="btn-outline">
                {t('common.checkAvailability')}
              </Link>
            </div>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1600&q=85"
              alt="Warm shared lounge and restaurant at West Premier Hotel"
              className="aspect-[5/4] w-full rounded-[28px] object-cover shadow-lift"
            />
            <span className="pill absolute bottom-4 left-4 bg-cream/95 text-forest">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                groups
              </span>
              <span>{t('facilities.openAll')}</span>
            </span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-page">
          <div className="grid gap-6 md:grid-cols-2">
            {FACILITIES.map((facility) => (
              <article
                key={facility.name}
                className="group overflow-hidden rounded-[28px] border border-line bg-white shadow-soft"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={facility.image}
                    alt={facility.alt}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <span className={`pill absolute left-4 top-4 ${facility.pillClass}`}>
                    {facility.pillIcon === 'dot' ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#1FA855]" />
                    ) : (
                      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                        {facility.pillIcon}
                      </span>
                    )}
                    <span>{t(facility.pillKey)}</span>
                  </span>
                </div>
                <div className="p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="eyebrow">{t(facility.eyebrow)}</p>
                      <h2 className="heading-sm mt-2">{t(facility.name)}</h2>
                    </div>
                    <span className="icon-tile">
                      <span className="material-symbols-outlined" aria-hidden="true">
                        {facility.icon}
                      </span>
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{t(facility.description)}</p>
                  <p className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold text-forest">
                    <span className="material-symbols-outlined text-[17px] text-gold-deep" aria-hidden="true">
                      schedule
                    </span>
                    <span>{t(facility.hours)}</span>
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Link to={facility.primary.to} className="btn-primary btn-sm">
                      {t(facility.primary.label)}
                    </Link>
                    <Link to={facility.secondary.to} className="link-arrow text-[13px]">
                      <span>{t(facility.secondary.label)}</span>
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                        arrow_forward
                      </span>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-sand/70 py-14 md:py-16">
        <div className="container-page">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="eyebrow">{t('facilities.extra.eyebrow')}</p>
              <h2 className="heading mt-3">{t('facilities.extra.title')}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{t('facilities.extra.text')}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {EXTRAS.map((extra) => (
                <div
                  key={extra.title}
                  className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-line"
                >
                  <span className="icon-tile h-10 w-10 rounded-xl">
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                      {extra.icon}
                    </span>
                  </span>
                  <div>
                    <h3 className="text-[13px] font-bold text-forest">{t(extra.title)}</h3>
                    <p className="mt-1 text-[11px] text-muted">{t(extra.text)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-cream py-14 md:py-16">
        <div className="container-page">
          <div className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-forest p-6 text-white shadow-soft sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold">
                {t('facilities.welcome.eyebrow')}
              </p>
              <h2 className="mt-2 font-serif text-2xl text-white sm:text-3xl">
                {t('facilities.welcome.title')}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/65">
                {t('facilities.welcome.text')}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/contact" className="btn-gold btn-sm">
                {t('nav.contact')}
              </Link>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-light btn-sm"
              >
                {t('common.whatsapp')}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
