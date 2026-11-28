import type { Language } from '../types';

export const SW_PATH_PREFIX = '/sw';

export type RouteComponentId =
  | 'home'
  | 'rooms'
  | 'booking'
  | 'manage-booking'
  | 'facilities'
  | 'dining'
  | 'conference'
  | 'gym'
  | 'offers'
  | 'blog'
  | 'blog-post'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'cancellation'
  | 'dashboard'
  | 'content-review';

export interface SiteRoute {
  /** Unprefixed path. English uses it directly; Kiswahili adds `/sw`. */
  path: string;
  /** Stable id used by the router, tests, SEO artifacts and CMS links. */
  id: RouteComponentId;
  /** Whether crawlers may index this route in either language. */
  indexable: boolean;
  /** Dynamic routes need a concrete CMS slug before they can enter the sitemap. */
  dynamic?: boolean;
}

/**
 * Single list of the app's real pages. The router, sitemap, robots and tests
 * must all derive their paths from here so they cannot drift apart.
 */
export const SITE_ROUTES: readonly SiteRoute[] = [
  { path: '/', id: 'home', indexable: true },
  { path: '/rooms', id: 'rooms', indexable: true },
  { path: '/booking', id: 'booking', indexable: true },
  { path: '/booking/manage', id: 'manage-booking', indexable: false },
  { path: '/facilities', id: 'facilities', indexable: true },
  { path: '/dining', id: 'dining', indexable: true },
  { path: '/conference', id: 'conference', indexable: true },
  { path: '/gym', id: 'gym', indexable: true },
  { path: '/offers', id: 'offers', indexable: true },
  { path: '/blog', id: 'blog', indexable: true },
  { path: '/blog/:slug', id: 'blog-post', indexable: true, dynamic: true },
  { path: '/contact', id: 'contact', indexable: true },
  { path: '/privacy', id: 'privacy', indexable: true },
  { path: '/terms', id: 'terms', indexable: true },
  { path: '/cancellation', id: 'cancellation', indexable: true },
  { path: '/dashboard', id: 'dashboard', indexable: false },
  { path: '/content-review', id: 'content-review', indexable: false },
];

export const INDEXABLE_ROUTES = SITE_ROUTES.filter((route) => route.indexable);
export const PRIVATE_ROUTES = SITE_ROUTES.filter((route) => !route.indexable);

export function languageFromPath(pathname: string): Language {
  return pathname === SW_PATH_PREFIX || pathname.startsWith(`${SW_PATH_PREFIX}/`)
    ? 'sw'
    : 'en';
}

/** Remove the Kiswahili URL prefix, returning an unprefixed app path. */
export function stripLanguagePrefix(pathname: string): string {
  if (pathname === SW_PATH_PREFIX) return '/';
  if (pathname.startsWith(`${SW_PATH_PREFIX}/`)) {
    return pathname.slice(SW_PATH_PREFIX.length) || '/';
  }
  return pathname || '/';
}

/** Add the Kiswahili prefix to an internal path while preserving query/hash. */
export function localizedPath(to: string, language: Language): string {
  if (/^[a-z][a-z\d+.-]*:/i.test(to) || to.startsWith('//')) {
    return to;
  }
  const marker = to.search(/[?#]/);
  const rawPath = marker === -1 ? to : to.slice(0, marker);
  const suffix = marker === -1 ? '' : to.slice(marker);
  const bare = stripLanguagePrefix(rawPath || '/');
  const path = bare.startsWith('/') ? bare : `/${bare}`;
  if (language === 'sw') {
    return `${SW_PATH_PREFIX}${path === '/' ? '/' : path}${suffix}`;
  }
  return `${path}${suffix}`;
}

/** React Router path segment for a manifest path (index route is empty). */
export function relativeRoutePath(path: string): string {
  return path === '/' ? '' : path.replace(/^\//, '');
}
