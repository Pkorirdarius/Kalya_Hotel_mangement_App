import { describe, expect, it } from 'vitest';
import {
  INDEXABLE_ROUTES,
  PRIVATE_ROUTES,
  SITE_ROUTES,
  languageFromPath,
  localizedPath,
  relativeRoutePath,
  stripLanguagePrefix,
} from './routes';

describe('route manifest', () => {
  it('keeps indexable and private lists consistent', () => {
    expect(INDEXABLE_ROUTES.every((route) => route.indexable)).toBe(true);
    expect(PRIVATE_ROUTES.every((route) => !route.indexable)).toBe(true);
    expect(INDEXABLE_ROUTES.length + PRIVATE_ROUTES.length).toBe(SITE_ROUTES.length);
    expect(PRIVATE_ROUTES.map((route) => route.path)).toEqual([
      '/booking/manage',
      '/dashboard',
      '/content-review',
    ]);
    expect(INDEXABLE_ROUTES.map((route) => route.path)).toContain('/blog');
    expect(SITE_ROUTES.find((route) => route.id === 'blog-post')).toMatchObject({
      path: '/blog/:slug',
      dynamic: true,
    });
  });

  it('maps relative React Router paths', () => {
    expect(relativeRoutePath('/')).toBe('');
    expect(relativeRoutePath('/rooms')).toBe('rooms');
  });
});

describe('language path helpers', () => {
  it('reads language from the URL only', () => {
    expect(languageFromPath('/')).toBe('en');
    expect(languageFromPath('/rooms')).toBe('en');
    expect(languageFromPath('/sw')).toBe('sw');
    expect(languageFromPath('/sw/rooms')).toBe('sw');
    expect(languageFromPath('/swimming')).toBe('en');
  });

  it('strips the Kiswahili prefix', () => {
    expect(stripLanguagePrefix('/')).toBe('/');
    expect(stripLanguagePrefix('/rooms')).toBe('/rooms');
    expect(stripLanguagePrefix('/sw')).toBe('/');
    expect(stripLanguagePrefix('/sw/rooms')).toBe('/rooms');
  });

  it('builds localized paths without losing query strings or hashes', () => {
    expect(localizedPath('/rooms', 'en')).toBe('/rooms');
    expect(localizedPath('/rooms', 'sw')).toBe('/sw/rooms');
    expect(localizedPath('/', 'sw')).toBe('/sw/');
    expect(localizedPath('/booking?checkin=2026-01-01#dates', 'sw')).toBe(
      '/sw/booking?checkin=2026-01-01#dates',
    );
    expect(localizedPath('/sw/rooms?x=1', 'en')).toBe('/rooms?x=1');
  });

  it('leaves external and protocol-relative URLs alone', () => {
    expect(localizedPath('https://example.test/rooms', 'sw')).toBe(
      'https://example.test/rooms',
    );
    expect(localizedPath('//example.test/rooms', 'sw')).toBe('//example.test/rooms');
  });
});
