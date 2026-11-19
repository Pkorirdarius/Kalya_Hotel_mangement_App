import { Link } from '../components/LocalizedLink';
import { usePageMeta } from '../components/Page';
import { useI18n } from '../i18n-context';
import { usePolicy } from '../lib/query/hooks';

type PolicySlug = 'privacy' | 'terms';

interface PolicyPageProps {
  slug: PolicySlug;
}

/**
 * CMS-driven privacy notice / booking terms.
 *
 * Text is seeded as a draft and must be reviewed by the hotel/legal adviser
 * before launch; the draft badge stays visible until that review clears
 * `needs_confirmation` in Django admin.
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

  return (
    <section className="container-page section">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">{t('footer.legal')}</p>
        <h1 className="display mt-4">{title}</h1>

        {data?.needs_confirmation ? (
          <p className="mt-5 inline-flex items-start gap-2 rounded-xl bg-gold-soft px-3 py-2 text-[12px] font-semibold text-gold-deep">
            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
              edit_note
            </span>
            <span>{t('policy.draft')}</span>
          </p>
        ) : null}

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

        {data ? (
          <p className="mt-8 border-t border-line pt-4 text-[11px] text-muted">
            {t('policy.version', { version: data.version || '—' })}
          </p>
        ) : null}
      </div>
    </section>
  );
}
