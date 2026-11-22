import { lazy, Suspense, useEffect } from 'react';
import { Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { ScrollToTop, RouteAnalytics } from './components/Page';
import { useI18n } from './i18n-context';
import { ROUTE_COMPONENTS, type RouteComponent } from './lib/routeComponents';
import {
  SITE_ROUTES,
  SW_PATH_PREFIX,
  languageFromPath,
  relativeRoutePath,
  type RouteComponentId,
} from './lib/routes';

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

type RouteComponentMap = Record<RouteComponentId, RouteComponent>;

/** Page routes are generated from the manifest so the router cannot drift. */
function sitePageRoutes(components: RouteComponentMap) {
  return SITE_ROUTES.filter((route) => route.id !== 'dashboard').map((route) => {
    const Component = components[route.id];
    return <Route key={route.id} path={relativeRoutePath(route.path)} element={<Component />} />;
  });
}

/** The dashboard stays outside the public site layout, in both languages. */
function dashboardRoutes(prefix: '' | '/sw', components: RouteComponentMap) {
  return SITE_ROUTES.filter((route) => route.id === 'dashboard').map((route) => {
    const Component = components[route.id];
    return (
      <Route
        key={`${prefix || 'en'}-${route.id}`}
        path={`${prefix}${route.path}`}
        element={<Component />}
      />
    );
  });
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

interface AppProps {
  /**
   * Direct page components are injected by the prerender build. The browser
   * keeps the lazy map so guests only download the route they open.
   */
  components?: RouteComponentMap;
}

export function App({ components = ROUTE_COMPONENTS }: AppProps) {
  return (
    <>
      <LanguageFromUrl />
      <ScrollToTop />
      <RouteAnalytics />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* English: unprefixed URLs. */}
          <Route path="/" element={<SiteLayout />}>
            {sitePageRoutes(components)}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          {dashboardRoutes('', components)}

          {/* Kiswahili: identical tree under /sw. */}
          <Route path={SW_PATH_PREFIX} element={<SiteLayout />}>
            {sitePageRoutes(components)}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          {dashboardRoutes(SW_PATH_PREFIX, components)}
        </Routes>
      </Suspense>
    </>
  );
}
