import { afterEach, describe, expect, it } from 'vitest';

import { HOTEL } from '../config/hotel';
import { setLanguage } from '../i18n';
import { INDEXABLE_ROUTES } from './routes';
import { buildPrerenderPage, prerenderTargetRoutes } from './prerenderMeta';

afterEach(() => {
  setLanguage('en', false);
});

describe('prerender metadata', () => {
  it('covers exactly the 12 static indexable routes', () => {
    const targets = prerenderTargetRoutes();
    expect(targets).toHaveLength(12);
    expect(targets.map((route) => route.id)).toEqual(
      INDEXABLE_ROUTES.filter((route) => !route.dynamic).map((route) => route.id),
    );
  });

  it('builds unique EN/SW titles, descriptions, canonicals and JSON-LD ids', () => {
    const pages = prerenderTargetRoutes().flatMap((route) => [
      buildPrerenderPage(route, 'en'),
      buildPrerenderPage(route, 'sw'),
    ]);

    expect(pages).toHaveLength(24);
    for (const field of ['title', 'description', 'canonical'] as const) {
      expect(new Set(pages.map((page) => page[field])).size).toBe(pages.length);
    }
    expect(new Set(pages.map((page) => page.jsonLd['@id'])).size).toBe(pages.length);
  });

  it('uses the URL language for canonical, OG locale and reciprocal hreflang', () => {
    const roomsEn = buildPrerenderPage(
      prerenderTargetRoutes().find((route) => route.path === '/rooms')!,
      'en',
    );
    const roomsSw = buildPrerenderPage(
      prerenderTargetRoutes().find((route) => route.path === '/rooms')!,
      'sw',
    );

    expect(roomsEn.canonical).toBe(`${HOTEL.websiteUrl}/rooms`);
    expect(roomsSw.canonical).toBe(`${HOTEL.websiteUrl}/sw/rooms`);
    expect(roomsEn.hreflangs).toEqual({
      en: `${HOTEL.websiteUrl}/rooms`,
      sw: `${HOTEL.websiteUrl}/sw/rooms`,
      'x-default': `${HOTEL.websiteUrl}/rooms`,
    });
    expect(roomsEn.ogLocale).toBe('en_KE');
    expect(roomsSw.ogLocale).toBe('sw_KE');
    expect(roomsEn.ogLocaleAlternate).toBe('sw_KE');
    expect(roomsSw.ogLocaleAlternate).toBe('en_KE');
  });
});
