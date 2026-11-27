import { HOTEL } from '../config/hotel';
import blogRoutes from '../content/blog-routes.json';
import { INDEXABLE_ROUTES, PRIVATE_ROUTES, localizedPath } from './routes';

export function siteUrl(site: string = HOTEL.websiteUrl): string {
  return site.replace(/\/$/, '');
}

function absolute(path: string, site: string): string {
  return `${siteUrl(site)}${encodeURI(path)}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Concrete unprefixed paths for the sitemap, expanding dynamic CMS routes. */
export function sitemapPaths(slugs: readonly string[] = blogRoutes.slugs): string[] {
  const paths: string[] = [];
  for (const route of INDEXABLE_ROUTES) {
    if (route.dynamic) {
      for (const slug of slugs) {
        paths.push(`/blog/${slug}`);
      }
    } else {
      paths.push(route.path);
    }
  }
  return [...new Set(paths)];
}

function urlEntry(path: string, site: string): string {
  const en = absolute(localizedPath(path, 'en'), site);
  const sw = absolute(localizedPath(path, 'sw'), site);
  return [
    '  <url>',
    `    <loc>${escapeXml(en)}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(en)}" />`,
    `    <xhtml:link rel="alternate" hreflang="sw" href="${escapeXml(sw)}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(en)}" />`,
    '  </url>',
    '  <url>',
    `    <loc>${escapeXml(sw)}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(en)}" />`,
    `    <xhtml:link rel="alternate" hreflang="sw" href="${escapeXml(sw)}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(en)}" />`,
    '  </url>',
  ].join('\n');
}

export function buildSitemap(
  slugs?: readonly string[],
  site: string = HOTEL.websiteUrl,
): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...sitemapPaths(slugs).map((path) => urlEntry(path, site)),
    '</urlset>',
    '',
  ].join('\n');
}

export function buildRobots(site: string = HOTEL.websiteUrl): string {
  const disallowed = [
    ...new Set(
      PRIVATE_ROUTES.flatMap((route) => [
        localizedPath(route.path, 'en'),
        localizedPath(route.path, 'sw'),
      ]),
    ),
  ];
  return [
    'User-agent: *',
    'Allow: /',
    ...disallowed.map((path) => `Disallow: ${path}`),
    '',
    `Sitemap: ${siteUrl(site)}/sitemap.xml`,
    '',
  ].join('\n');
}
