import { Link } from 'react-router-dom';
import { usePageMeta } from '../components/Page';

export function NotFoundPage() {
  usePageMeta('Page not found — West Premier Hotel, Kapenguria');

  return (
    <section className="container-page section">
      <div className="mx-auto max-w-xl text-center">
        <p className="eyebrow">404</p>
        <h1 className="display mt-4">This page has checked out.</h1>
        <p className="lede mt-4">
          The page you were looking for is not here. Head back to the lobby, or book a room for your next stay.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-primary">
            Back to home
          </Link>
          <Link to="/rooms" className="btn-outline">
            View rooms
          </Link>
          <Link to="/contact" className="btn-ghost">
            Contact us
          </Link>
        </div>
      </div>
    </section>
  );
}
