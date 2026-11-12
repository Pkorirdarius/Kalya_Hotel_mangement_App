import { Link } from 'react-router-dom';
import { usePageMeta } from '../components/Page';
import { useI18n } from '../i18n-context';

export function NotFoundPage() {
  const { t } = useI18n();
  usePageMeta(t('meta.notFound.title'));

  return (
    <section className="container-page section">
      <div className="mx-auto max-w-xl text-center">
        <p className="eyebrow">404</p>
        <h1 className="display mt-4">{t('notFound.title')}</h1>
        <p className="lede mt-4">{t('notFound.text')}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-primary">
            {t('notFound.ctaHome')}
          </Link>
          <Link to="/rooms" className="btn-outline">
            {t('notFound.ctaRooms')}
          </Link>
          <Link to="/contact" className="btn-ghost">
            {t('notFound.ctaContact')}
          </Link>
        </div>
      </div>
    </section>
  );
}
