import { describe, expect, it } from 'vitest';

import { HOTEL } from '../config/hotel';
import { ROUTE_COMPONENTS } from './routeComponents';
import { INDEXABLE_ROUTES, PRIVATE_ROUTES, SITE_ROUTES } from './routes';
import { buildRobots, buildSitemap, sitemapPaths } from './seo';

describe('route manifest drift', () => {
  it('has one component for every manifest route', () => {
    const ids = SITE_ROUTES.map((route) => route.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(ROUTE_COMPONENTS).sort()).toEqual([...ids].sort());
  });

  it('keeps private routes out of the sitemap', () => {
    const sitemap = buildSitemap();
    for (const route of PRIVATE_ROUTES) {
      expect(sitemap).not.toContain(`<loc>${HOTEL.websiteUrl}${route.path}`);
      expect(sitemap).not.toContain(`<loc>${HOTEL.websiteUrl}/sw${route.path}`);
    }
  });

  it('keeps every indexable route in the sitemap', () => {
    const paths = sitemapPaths(['first-post']);
    for (const route of INDEXABLE_ROUTES) {
      if (route.dynamic) continue;
      expect(paths).toContain(route.path);
    }
    expect(paths).toContain('/blog/first-post');
  });
});

describe('sitemap and robots', () => {
  it('emits both languages and reciprocal hreflang links', () => {
    const sitemap = buildSitemap(['first-post']);
    const en = `${HOTEL.websiteUrl}/rooms`;
    const sw = `${HOTEL.websiteUrl}/sw/rooms`;

    expect(sitemap).toContain(`<loc>${en}</loc>`);
    expect(sitemap).toContain(`<loc>${sw}</loc>`);
    expect(sitemap).toContain(`hreflang="en" href="${en}"`);
    expect(sitemap).toContain(`hreflang="sw" href="${sw}"`);
    expect(sitemap).toContain(`hreflang="x-default" href="${en}"`);
    expect(sitemap).toContain(`<loc>${HOTEL.websiteUrl}/blog/first-post</loc>`);
    expect(sitemap).toContain(`<loc>${HOTEL.websiteUrl}/sw/blog/first-post</loc>`);
  });

  it('disallows private routes in both languages', () => {
    const robots = buildRobots();
    for (const route of PRIVATE_ROUTES) {
      expect(robots).toContain(`Disallow: ${route.path}`);
      expect(robots).toContain(`Disallow: /sw${route.path}`);
    }
    expect(robots).toContain(`Sitemap: ${HOTEL.websiteUrl}/sitemap.xml`);
  });
});
