import { Link } from '../components/LocalizedLink';
import { usePageMeta } from '../components/Page';
import { useI18n } from '../i18n-context';
import { analyticsEnabled } from '../lib/analytics';
import { usePolicy } from '../lib/query/hooks';

type PolicySlug = 'privacy' | 'terms' | 'cancellation';

interface PolicyPageProps {
  slug: PolicySlug;
}

/**
 * CMS-driven, admin-editable legal pages.
 *
 * Rows with `needs_confirmation=True` are hidden by the public API, so the
 * pending-approval state is only visible to staff in Django admin and at
 * /content-review. Guests never see unapproved wording.
 */
export function PolicyPage({ slug }: PolicyPageProps) {
  const { t, language } = useI18n();
  const { data, isError, isLoading } = usePolicy(slug);
  const isSwahili = language === 'sw';

  const title = data
    ? isSwahili && data.title_sw
      ? data.title_sw
      : data.title_en
    : t(`meta.${slug}.title`);
  usePageMeta(title, t(`meta.${slug}.description`));

  const body = data
    ? (isSwahili && data.body_sw ? data.body_sw : data.body_en) ?? ''
    : '';
  const paragraphs = body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const showAnalyticsNotice = slug === 'privacy' && Boolean(data) && analyticsEnabled();

  return (
    <section className="container-page section">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">{t('footer.legal')}</p>
        <h1 className="display mt-4">{title}</h1>

        {isLoading ? (
          <p className="mt-8 text-sm text-muted" role="status">
            {t('common.loading')}
          </p>
        ) : null}

        {isError ? (
          <div className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-soft">
            <p className="text-sm leading-relaxed text-muted">{t('policy.unavailable')}</p>
            <Link to="/contact" className="btn-outline btn-sm mt-4">
              {t('common.contactUs')}
            </Link>
          </div>
        ) : null}

        {paragraphs.length > 0 ? (
          <div className="mt-8 space-y-4">
            {paragraphs.map((paragraph, index) => (
              <p key={`${slug}-${index}`} className="text-[15px] leading-relaxed text-ink/80">
                {paragraph}
              </p>
            ))}
          </div>
        ) : null}

        {showAnalyticsNotice ? (
          <p className="mt-6 rounded-2xl bg-sand/60 p-4 text-[13px] leading-relaxed text-ink/70">
            {t('policy.analytics')}
          </p>
        ) : null}

        {data ? (
          <p className="mt-8 border-t border-line pt-4 text-[11px] text-muted">
            {t('policy.version', { version: data.version || '—' })}
          </p>
        ) : null}
      </div>
    </section>
  );
}
