import { Link } from '../components/LocalizedLink';
import { PageHero, usePageMeta } from '../components/Page';
import { useI18n } from '../i18n-context';
import { usePosts } from '../lib/query/hooks';

export function BlogIndexPage() {
  const { t, language, formatDate } = useI18n();
  const { data: posts, isError, isLoading } = usePosts();
  usePageMeta(t('meta.blog.title'), t('meta.blog.description'));

  const isSwahili = language === 'sw';
  const pick = (en?: string, sw?: string) => (isSwahili && sw ? sw : en) ?? '';

  return (
    <>
      <PageHero
        eyebrow={t('blog.eyebrow')}
        title={t('blog.title')}
        text={t('blog.text')}
      />

      <section className="container-page section">
        {isLoading ? (
          <p className="text-sm text-muted" role="status">
            {t('common.loading')}
          </p>
        ) : null}

        {isError ? (
          <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
            <p className="text-sm leading-relaxed text-muted">{t('blog.error')}</p>
            <Link to="/contact" className="btn-outline btn-sm mt-4">
              {t('common.contactUs')}
            </Link>
          </div>
        ) : null}

        {!isLoading && !isError && posts?.length === 0 ? (
          <p className="text-sm text-muted">{t('blog.empty')}</p>
        ) : null}

        {posts && posts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => {
              const title = pick(post.title_en, post.title_sw) || post.slug;
              const excerpt = pick(post.excerpt_en, post.excerpt_sw);
              const image = post.image?.trim();
              return (
                <article
                  key={post.slug}
                  className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft"
                >
                  {image ? (
                    <img
                      src={image}
                      alt={post.image_alt || title}
                      loading="lazy"
                      className="h-44 w-full object-cover"
                    />
                  ) : null}
                  <div className="p-5">
                    <p className="eyebrow">
                      {[post.category, post.published_at ? formatDate(post.published_at.slice(0, 10)) : '']
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    <h2 className="heading mt-3 text-xl">{title}</h2>
                    {excerpt ? <p className="mt-3 text-sm leading-relaxed text-muted">{excerpt}</p> : null}
                    {post.needs_confirmation ? (
                      <p className="mt-3 text-[11px] font-semibold text-gold-deep">
                        {t('blog.draft')}
                      </p>
                    ) : null}
                    <Link to={`/blog/${post.slug}`} className="btn-outline btn-sm mt-5">
                      {t('blog.readPost')}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </>
  );
}
