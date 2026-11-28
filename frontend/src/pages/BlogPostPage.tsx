import { useParams } from 'react-router-dom';

import { Link } from '../components/LocalizedLink';
import { usePageMeta } from '../components/Page';
import { useI18n } from '../i18n-context';
import { usePost } from '../lib/query/hooks';

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, language, formatDate } = useI18n();
  const { data: post, isError, isLoading } = usePost(slug);
  const isSwahili = language === 'sw';
  const pick = (en?: string, sw?: string) => (isSwahili && sw ? sw : en) ?? '';

  const title = post ? pick(post.title_en, post.title_sw) || post.slug : t('meta.blogPost.title', { title: t('blog.title') });
  const excerpt = post ? pick(post.excerpt_en, post.excerpt_sw) : '';
  usePageMeta(
    title,
    excerpt ? t('meta.blogPost.description', { excerpt }) : t('meta.blog.description'),
  );

  const body = post ? pick(post.body_en, post.body_sw) : '';
  const paragraphs = body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const image = post?.image?.trim();

  return (
    <section className="container-page section">
      <div className="mx-auto max-w-3xl">
        <Link to="/blog" className="text-sm font-semibold text-forest hover:underline">
          {t('blog.back')}
        </Link>

        {isLoading ? (
          <p className="mt-8 text-sm text-muted" role="status">
            {t('common.loading')}
          </p>
        ) : null}

        {isError || (!isLoading && !post) ? (
          <div className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-soft">
            <p className="text-sm leading-relaxed text-muted">{t('blog.notFound')}</p>
            <Link to="/blog" className="btn-outline btn-sm mt-4">
              {t('blog.title')}
            </Link>
          </div>
        ) : null}

        {post ? (
          <>
            <p className="eyebrow mt-8">
              {[post.category, post.published_at ? formatDate(post.published_at.slice(0, 10)) : '']
                .filter(Boolean)
                .join(' · ')}
            </p>
            <h1 className="display mt-4">{title}</h1>

            {post.needs_confirmation ? (
              <p className="mt-4 inline-flex items-start gap-2 rounded-xl bg-gold-soft px-3 py-2 text-[12px] font-semibold text-gold-deep">
                <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                  edit_note
                </span>
                <span>{t('blog.draft')}</span>
              </p>
            ) : null}

            {image ? (
              <img
                src={image}
                alt={post.image_alt || title}
                className="mt-8 h-64 w-full rounded-2xl object-cover"
              />
            ) : null}

            {excerpt ? <p className="lede mt-8">{excerpt}</p> : null}

            {paragraphs.length > 0 ? (
              <div className="mt-8 space-y-4">
                {paragraphs.map((paragraph, index) => (
                  <p key={`${post.slug}-${index}`} className="text-[15px] leading-relaxed text-ink/80">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
