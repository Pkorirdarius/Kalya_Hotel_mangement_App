import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../components/Page';
import { useI18n } from '../i18n-context';

type Category = 'offers' | 'dining' | 'meetings' | 'journal';

interface Article {
  id: string;
  category: Category;
  titleKey: string;
  tagKey: string;
  bodyKey: string;
  image: string;
  alt: string;
  date: string;
  metaKey: string;
  ctaTo?: string;
  ctaLabelKey?: string;
  excerptKey: string;
}

const FILTERS: Array<{ key: 'all' | Category; labelKey: string }> = [
  { key: 'all', labelKey: 'offers.filter.all' },
  { key: 'offers', labelKey: 'offers.filter.offers' },
  { key: 'dining', labelKey: 'offers.filter.dining' },
  { key: 'meetings', labelKey: 'offers.filter.meetings' },
  { key: 'journal', labelKey: 'offers.filter.journal' },
];

const ARTICLES: Article[] = [
  {
    id: 'ngo',
    category: 'offers',
    titleKey: 'offer.ngo.title',
    tagKey: 'offer.ngo.tag',
    bodyKey: 'article.ngo.body',
    image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=85',
    alt: 'NGO team meeting around a table',
    date: '2026-11-01',
    metaKey: 'offer.ngo.price',
    excerptKey: 'offer.ngo.description',
    ctaTo: '/booking?offer=ngo',
    ctaLabelKey: 'offer.ngo.cta',
  },
  {
    id: 'brunch',
    category: 'dining',
    titleKey: 'offer.brunch.title',
    tagKey: 'offer.brunch.tag',
    bodyKey: 'article.brunch.body',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=85',
    alt: 'A generous Sunday brunch spread',
    date: '2026-11-08',
    metaKey: 'offer.brunch.price',
    excerptKey: 'offer.brunch.description',
    ctaTo: '/dining?venue=restaurant',
    ctaLabelKey: 'offer.brunch.cta',
  },
  {
    id: 'meetings',
    category: 'meetings',
    titleKey: 'offer.meetings.title',
    tagKey: 'offer.meetings.tag',
    bodyKey: 'article.meetings.body',
    image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=85',
    alt: 'Kilele Hall set for a workshop',
    date: '2026-10-20',
    metaKey: 'offer.meetings.price',
    excerptKey: 'offer.meetings.description',
    ctaTo: '/conference#book',
    ctaLabelKey: 'offer.meetings.cta',
  },
  {
    id: 'westlands',
    category: 'journal',
    titleKey: 'journal.westlands.title',
    tagKey: 'journal.westlands.tag',
    bodyKey: 'article.westlands.body',
    image: 'https://images.unsplash.com/photo-1611348586804-61bf6c080437?auto=format&fit=crop&w=1200&q=85',
    alt: 'Kapenguria city skyline at dusk',
    date: '2026-10-12',
    metaKey: 'journal.readTime',
    excerptKey: 'journal.westlands.excerpt',
  },
  {
    id: 'coffee',
    category: 'journal',
    titleKey: 'journal.coffee.title',
    tagKey: 'journal.coffee.tag',
    bodyKey: 'article.coffee.body',
    image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1200&q=85',
    alt: 'Freshly roasted Kenyan coffee beans',
    date: '2026-09-28',
    metaKey: 'journal.readTime',
    excerptKey: 'journal.coffee.excerpt',
  },
  {
    id: 'green',
    category: 'journal',
    titleKey: 'journal.green.title',
    tagKey: 'journal.green.tag',
    bodyKey: 'article.green.body',
    image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=85',
    alt: 'Green leaves in a Kapenguria garden',
    date: '2026-09-05',
    metaKey: 'journal.readTime',
    excerptKey: 'journal.green.excerpt',
  },
];

const FEATURED = {
  titleKey: 'offer.longStay.title',
  tagKey: 'offer.longStay.tag',
  bodyKey: 'article.longStay.body',
  image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=85',
  ctaTo: '/booking?offer=long-stay',
  ctaLabelKey: 'offer.longStay.cta',
};

export function OffersPage() {
  const { t, language } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [filter, setFilter] = useState<'all' | Category>('all');
  const [active, setActive] = useState<Article | null>(null);

  usePageMeta(
    'Offers & Journal — West Premier Hotel, Kapenguria',
    'Direct-only rates, seasonal menus and notes from the neighbourhood at West Premier Hotel in Westlands, Kapenguria.',
  );

  const visible = ARTICLES.filter((article) => filter === 'all' || article.category === filter);

  const monthYear = (iso: string) =>
    new Intl.DateTimeFormat(language === 'sw' ? 'sw-KE' : 'en-GB', { month: 'short', year: 'numeric' }).format(
      new Date(`${iso}T12:00:00`),
    );

  useEffect(() => {
    if (active && !dialogRef.current?.open) {
      dialogRef.current?.showModal();
    }
  }, [active]);

  const openArticle = (article: Article) => setActive(article);

  const closeArticle = () => {
    dialogRef.current?.close();
    setActive(null);
  };

  return (
    <>
      <section className="border-b border-line bg-sand/60 py-12 md:py-16">
        <div className="container-page max-w-3xl">
          <p className="eyebrow">{t('offers.eyebrow')}</p>
          <h1 className="display mt-4">{t('offers.title')}</h1>
          <p className="lede mt-5">{t('offers.text')}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <a href="#stories" className="btn-primary btn-sm">
              {t('offers.browse')}
            </a>
            <Link to="/booking" className="btn-outline btn-sm">
              {t('common.bookDirect')}
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page section">
        <div className="grid overflow-hidden rounded-[32px] border border-line bg-white shadow-soft lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[280px] lg:min-h-full">
            <img
              src={FEATURED.image}
              alt="A calm Standard Executive room at West Premier Hotel"
              className="absolute inset-0 h-full w-full object-cover"
              fetchPriority="high"
            />
            <span className="pill absolute left-4 top-4 bg-gold text-forest-dark">{t('offers.featured')}</span>
          </div>
          <div className="p-6 sm:p-8 lg:p-10">
            <p className="eyebrow">{t(FEATURED.tagKey)}</p>
            <h2 className="heading mt-3">{t(FEATURED.titleKey)}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{t('offer.longStay.description')}</p>
            <p className="mt-4 font-serif text-2xl text-forest-dark">{t('offer.longStay.price')}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-semibold text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-gold-deep" aria-hidden="true">
                  calendar_month
                </span>
                <span>{t('offers.minNights')}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-gold-deep" aria-hidden="true">
                  cancel
                </span>
                <span>{t('common.freeCancellation')}</span>
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to={FEATURED.ctaTo} className="btn-gold btn-sm">
                {t(FEATURED.ctaLabelKey)}
              </Link>
              <button
                type="button"
                className="btn-outline btn-sm"
                onClick={() =>
                  openArticle({
                    id: 'long-stay',
                    category: 'offers',
                    titleKey: FEATURED.titleKey,
                    tagKey: FEATURED.tagKey,
                    bodyKey: FEATURED.bodyKey,
                    image: FEATURED.image,
                    alt: 'A calm Standard Executive room at West Premier Hotel',
                    date: '2026-11-01',
                    metaKey: 'offer.longStay.price',
                    excerptKey: 'offer.longStay.description',
                    ctaTo: FEATURED.ctaTo,
                    ctaLabelKey: FEATURED.ctaLabelKey,
                  })
                }
              >
                {t('common.readMore')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="stories" className="container-page section scroll-mt-24">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-xl">
            <p className="eyebrow">{t('offers.stories.eyebrow')}</p>
            <h2 className="heading mt-3">{t('offers.stories.title')}</h2>
          </div>
          <div
            className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label={t('offers.filterLabel')}
          >
            {FILTERS.map((item) => {
              const selected = filter === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setFilter(item.key)}
                  className={`min-h-[38px] shrink-0 rounded-full px-4 text-[11px] font-bold transition ${
                    selected ? 'bg-forest text-white' : 'bg-white text-muted ring-1 ring-line hover:text-forest'
                  }`}
                >
                  {t(item.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((article) => (
            <article
              key={article.id}
              className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={article.image}
                  alt={article.alt}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <span
                  className={`pill absolute left-3 top-3 ${
                    article.category === 'offers' ? 'bg-gold text-forest-dark' : 'bg-cream/95 text-forest'
                  }`}
                >
                  {t(article.tagKey)}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                  <time dateTime={article.date}>{monthYear(article.date)}</time>
                </p>
                <h3 className="mt-2 font-serif text-xl leading-snug text-forest-dark">{t(article.titleKey)}</h3>
                <p className="mt-2 flex-1 text-[12px] leading-relaxed text-muted">{t(article.excerptKey)}</p>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
                  <span className="text-[12px] font-bold text-forest">{t(article.metaKey)}</span>
                  <button type="button" className="link-arrow text-[12px]" onClick={() => openArticle(article)}>
                    {t('common.readMore')}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-white p-10 text-center">
            <span className="material-symbols-outlined text-[34px] text-muted" aria-hidden="true">
              auto_stories
            </span>
            <p className="mt-2 text-sm font-semibold text-muted">{t('offers.filterEmpty')}</p>
          </div>
        ) : null}
      </section>

      <section className="bg-forest py-14 text-white">
        <div className="container-page flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold">{t('newsletter.eyebrow')}</p>
            <h2 className="mt-2 font-serif text-2xl text-white sm:text-3xl">{t('newsletter.title')}</h2>
            <p className="mt-2 max-w-lg text-sm text-white/60">{t('newsletter.text')}</p>
          </div>
          <Link to="/contact" className="btn-gold">
            {t('newsletter.cta')}
          </Link>
        </div>
      </section>

      <dialog
        ref={dialogRef}
        className="w-[min(94vw,720px)] overflow-hidden rounded-3xl border border-line bg-cream p-0 text-ink shadow-lift backdrop:bg-forest-dark/60 backdrop:backdrop-blur-sm"
        onClose={() => setActive(null)}
        onClick={(event) => {
          if (event.target === dialogRef.current) closeArticle();
        }}
      >
        {active ? (
          <>
            <div className="relative h-52 overflow-hidden sm:h-64">
              <img src={active.image} alt={t(active.titleKey)} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={closeArticle}
                className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-cream/90 text-forest shadow-soft transition hover:bg-white"
                aria-label={t('common.close')}
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  close
                </span>
              </button>
              <span className="pill absolute bottom-3 left-3 bg-gold text-forest-dark">{t(active.tagKey)}</span>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-5 sm:p-7">
              <h2 className="heading-sm">{t(active.titleKey)}</h2>
              <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-muted">{t(active.bodyKey)}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {active.ctaTo && active.ctaLabelKey ? (
                  <Link to={active.ctaTo} className="btn-primary btn-sm" onClick={closeArticle}>
                    {t(active.ctaLabelKey)}
                  </Link>
                ) : null}
                <button type="button" className="btn-outline btn-sm" onClick={closeArticle}>
                  {t('common.close')}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </dialog>
    </>
  );
}
