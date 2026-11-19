import { lazy, Suspense, useEffect } from 'react';
import { Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { ScrollToTop, RouteAnalytics } from './components/Page';
import { useI18n } from './i18n-context';
import { languageFromPath, SW_PATH_PREFIX } from './lib/routes';

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })));
const RoomsPage = lazy(() => import('./pages/RoomsPage').then((module) => ({ default: module.RoomsPage })));
const BookingPage = lazy(() => import('./pages/BookingPage').then((module) => ({ default: module.BookingPage })));
const BookingManagePage = lazy(() =>
  import('./pages/BookingManagePage').then((module) => ({ default: module.BookingManagePage })),
);
const FacilitiesPage = lazy(() =>
  import('./pages/FacilitiesPage').then((module) => ({ default: module.FacilitiesPage })),
);
const DiningPage = lazy(() => import('./pages/DiningPage').then((module) => ({ default: module.DiningPage })));
const ConferencePage = lazy(() =>
  import('./pages/ConferencePage').then((module) => ({ default: module.ConferencePage })),
);
const GymPage = lazy(() => import('./pages/GymPage').then((module) => ({ default: module.GymPage })));
const OffersPage = lazy(() => import('./pages/OffersPage').then((module) => ({ default: module.OffersPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then((module) => ({ default: module.ContactPage })));
const PolicyPage = lazy(() =>
  import('./pages/PolicyPage').then((module) => ({ default: module.PolicyPage })),
);
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-forest" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

function SiteLayout() {
  return (
    <>
      <Header />
      <main id="main">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

/**
 * Keep the active UI language in step with the URL. This never redirects:
 * crawlers and direct links always get the language encoded in the path,
 * even if localStorage holds a different preference.
 */
function LanguageFromUrl() {
  const { pathname } = useLocation();
  const { language, setLanguage } = useI18n();
  const pathLanguage = languageFromPath(pathname);

  useEffect(() => {
    if (language !== pathLanguage) setLanguage(pathLanguage);
  }, [language, pathLanguage, setLanguage]);

  return null;
}

export function App() {
  return (
    <>
      <LanguageFromUrl />
      <ScrollToTop />
      <RouteAnalytics />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* English: unprefixed URLs. */}
          <Route path="/" element={<SiteLayout />}>
            <Route index element={<HomePage />} />
            <Route path="rooms" element={<RoomsPage />} />
            <Route path="booking" element={<BookingPage />} />
            <Route path="booking/manage" element={<BookingManagePage />} />
            <Route path="facilities" element={<FacilitiesPage />} />
            <Route path="dining" element={<DiningPage />} />
            <Route path="conference" element={<ConferencePage />} />
            <Route path="gym" element={<GymPage />} />
            <Route path="offers" element={<OffersPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="privacy" element={<PolicyPage slug="privacy" />} />
            <Route path="terms" element={<PolicyPage slug="terms" />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Kiswahili: identical tree under /sw. */}
          <Route path={SW_PATH_PREFIX} element={<SiteLayout />}>
            <Route index element={<HomePage />} />
            <Route path="rooms" element={<RoomsPage />} />
            <Route path="booking" element={<BookingPage />} />
            <Route path="booking/manage" element={<BookingManagePage />} />
            <Route path="facilities" element={<FacilitiesPage />} />
            <Route path="dining" element={<DiningPage />} />
            <Route path="conference" element={<ConferencePage />} />
            <Route path="gym" element={<GymPage />} />
            <Route path="offers" element={<OffersPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="privacy" element={<PolicyPage slug="privacy" />} />
            <Route path="terms" element={<PolicyPage slug="terms" />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path={`${SW_PATH_PREFIX}/dashboard`} element={<DashboardPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
