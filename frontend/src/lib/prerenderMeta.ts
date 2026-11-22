import { HOTEL } from '../config/hotel';
import { setLanguage, t } from '../i18n';
import type { Language } from '../types';
import { INDEXABLE_ROUTES, localizedPath, type RouteComponentId, type SiteRoute } from './routes';

const SITE_URL = HOTEL.websiteUrl.replace(/\/$/, '');

interface MetaKeys {
  title: string;
  description: string;
}

const META_KEYS: Record<string, MetaKeys> = {
  home: { title: 'meta.home.title', description: 'meta.home.description' },
  rooms: { title: 'meta.rooms.title', description: 'meta.rooms.description' },
  booking: { title: 'meta.booking.title', description: 'meta.booking.description' },
  facilities: { title: 'meta.facilities.title', description: 'meta.facilities.description' },
  dining: { title: 'meta.dining.title', description: 'meta.dining.description' },
  conference: { title: 'meta.conference.title', description: 'meta.conference.description' },
  gym: { title: 'meta.gym.title', description: 'meta.gym.description' },
  offers: { title: 'meta.offers.title', description: 'meta.offers.description' },
  blog: { title: 'meta.blog.title', description: 'meta.blog.description' },
  contact: { title: 'meta.contact.title', description: 'meta.contact.description' },
  privacy: { title: 'meta.privacy.title', description: 'meta.privacy.description' },
  terms: { title: 'meta.terms.title', description: 'meta.terms.description' },
};

export interface PrerenderPage {
  route: SiteRoute;
  language: Language;
  path: string;
  title: string;
  description: string;
  canonical: string;
  hreflangs: Record<'en' | 'sw' | 'x-default', string>;
  ogLocale: string;
  ogLocaleAlternate: string;
  jsonLd: Record<string, unknown>;
}

/** The 12 marketing routes that have complete static copy in both languages. */
export function prerenderTargetRoutes(): SiteRoute[] {
  return INDEXABLE_ROUTES.filter((route) => !route.dynamic);
}

function absolute(path: string): string {
  return `${SITE_URL}${encodeURI(path)}`;
}

/**
 * Build the head data for one prerendered page. CMS-backed sections still load
 * after hydration; this is the deterministic static fallback shown to crawlers
 * and when the API is unreachable.
 */
export function buildPrerenderPage(route: SiteRoute, language: Language): PrerenderPage {
  const keys = META_KEYS[route.id];
  if (!keys) {
    throw new Error(`No prerender metadata for route "${route.id}"`);
  }

  setLanguage(language, false);

  const title = t(keys.title);
  const description = t(keys.description);
  const en = absolute(localizedPath(route.path, 'en'));
  const sw = absolute(localizedPath(route.path, 'sw'));
  const canonical = absolute(localizedPath(route.path, language));
  const home = absolute(localizedPath('/', language));

  const breadcrumb: Record<string, unknown>[] = [
    {
      '@type': 'ListItem',
      position: 1,
      name: t('common.home'),
      item: home,
    },
  ];
  if (route.id !== 'home') {
    breadcrumb.push({ '@type': 'ListItem', position: 2, name: title, item: canonical });
  }

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: title,
    description,
    inLanguage: language === 'sw' ? 'sw-KE' : 'en-KE',
    isPartOf: { '@id': `${SITE_URL}/#hotel` },
    about: { '@type': 'Hotel', '@id': `${SITE_URL}/#hotel`, name: HOTEL.name },
    breadcrumb: { '@type': 'BreadcrumbList', itemListElement: breadcrumb },
  };

  return {
    route,
    language,
    path: localizedPath(route.path, language),
    title,
    description,
    canonical,
    hreflangs: { en, sw, 'x-default': en },
    ogLocale: language === 'sw' ? 'sw_KE' : 'en_KE',
    ogLocaleAlternate: language === 'sw' ? 'en_KE' : 'sw_KE',
    jsonLd,
  };
}

/** Guard against adding a prerendered route without adding its metadata. */
export function prerenderRouteIds(): RouteComponentId[] {
  return prerenderTargetRoutes().map((route) => route.id);
}
