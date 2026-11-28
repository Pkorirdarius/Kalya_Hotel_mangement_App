import { Link } from '../components/LocalizedLink';
import { usePageMeta } from '../components/Page';
import { HOTEL } from '../config/hotel';
import { useI18n } from '../i18n-context';
import {
  useContentConfirmation,
  useStaffMe,
} from '../lib/query/hooks';

function formatUpdated(iso: string, language: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(language === 'sw' ? 'sw-KE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function kindLabel(kind: string, t: (key: string) => string) {
  return t(`contentReview.kind.${kind}`);
}

export function ContentConfirmationPage() {
  const { t, language } = useI18n();
  usePageMeta(t('meta.contentReview.title', { name: HOTEL.name }), undefined, true);

  const staff = useStaffMe();
  const user = staff.data?.user;
  const review = useContentConfirmation({ enabled: Boolean(user) });

  if (staff.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#071a14] px-4">
        <p className="text-sm text-white/60" role="status">
          {t('contentReview.loading')}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#071a14] text-white">
        <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 text-center">
          <span className="material-symbols-outlined text-4xl text-gold" aria-hidden="true">
            lock
          </span>
          <h1 className="mt-4 font-serif text-3xl">
            {t('contentReview.gate.title')}
          </h1>
          <p className="mt-2 text-sm text-white/60">{t('contentReview.gate.text')}</p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-gold px-5 text-[12px] font-bold uppercase tracking-[0.1em] text-forest-dark transition hover:bg-white"
          >
            {t('contentReview.dashboard')}
          </Link>
        </div>
      </div>
    );
  }

  const items = review.data?.items ?? [];

  return (
    <div className="min-h-screen bg-[#071a14] text-white">
      <header className="border-b border-white/10 bg-forest-dark">
        <div className="mx-auto flex min-h-[68px] max-w-[1200px] items-center justify-between gap-4 px-4 lg:px-8">
          <Link to="/dashboard" className="inline-flex min-h-[44px] items-center gap-2 text-sm text-white/70 transition hover:text-white">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              arrow_back
            </span>
            {t('contentReview.dashboard')}
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
            {HOTEL.shortName}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 py-8 lg:px-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
          {t('contentReview.eyebrow')}
        </p>
        <h1 className="mt-2 font-serif text-3xl sm:text-4xl">
          {t('contentReview.title')}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
          {t('contentReview.text')}
        </p>

        <div className="mt-6 flex flex-wrap gap-2" aria-label={t('contentReview.title')}>
          {Object.entries(review.data?.counts ?? {}).map(([kind, count]) => (
            <span
              key={kind}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/70"
            >
              {kindLabel(kind, t)}: {count}
            </span>
          ))}
        </div>

        <p className="mt-4 text-[12px] font-semibold text-white/60">
          {t('contentReview.total', { count: review.data?.total ?? 0 })}
        </p>

        <div className="mt-4 overflow-x-auto rounded-3xl border border-white/10 bg-white/[0.03]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">{t('contentReview.title')}</caption>
            <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.14em] text-white/45">
              <tr>
                <th scope="col" className="px-5 py-3 font-bold">
                  {t('contentReview.column.kind')}
                </th>
                <th scope="col" className="px-5 py-3 font-bold">
                  {t('contentReview.column.item')}
                </th>
                <th scope="col" className="px-5 py-3 font-bold">
                  {t('contentReview.column.updated')}
                </th>
                <th scope="col" className="px-5 py-3 font-bold">
                  {t('contentReview.column.id')}
                </th>
              </tr>
            </thead>
            <tbody>
              {review.isPending ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-white/55" role="status">
                    {t('contentReview.loading')}
                  </td>
                </tr>
              ) : review.isError ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center">
                    <p className="text-white/70">{t('contentReview.error')}</p>
                    <button
                      type="button"
                      onClick={() => void review.refetch()}
                      className="mt-3 min-h-[40px] rounded-full border border-white/20 px-4 text-[12px] font-semibold text-white/80 transition hover:border-white/40"
                    >
                      {t('contentReview.retry')}
                    </button>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-white/55">
                    {t('contentReview.empty')}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={`${item.model}:${item.id}`}
                    className="border-b border-white/[0.06] last:border-0"
                  >
                    <td className="px-5 py-3 text-white/80">
                      {kindLabel(item.kind, t)}
                    </td>
                    <td className="px-5 py-3 font-semibold text-white">
                      {item.label}
                    </td>
                    <td className="px-5 py-3 text-white/55">
                      {item.active
                        ? formatUpdated(item.updated_at, language)
                        : t('contentReview.inactive')}
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px] text-white/45">
                      {item.id}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
