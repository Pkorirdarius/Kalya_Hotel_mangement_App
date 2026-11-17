import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { HOTEL } from './src/config/hotel';

/**
 * Injects brand values into index.html at dev/build time so no brand string
 * is hard-coded in the HTML template. Renaming the hotel only requires
 * editing src/config/hotel.ts.
 */
function brandHtml(): Plugin {
  const location = `${HOTEL.location.town}, ${HOTEL.location.county}`;
  const description = `${HOTEL.name} in ${location}. Warm, independent rooms, farm-to-table dining, conference facilities and a fitness studio. Book direct for the best rate.`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    '@id': `${HOTEL.websiteUrl}/#hotel`,
    name: HOTEL.name,
    legalName: HOTEL.legalName,
    url: HOTEL.websiteUrl,
    telephone: HOTEL.contact.phoneDisplay,
    email: HOTEL.contact.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: HOTEL.location.addressLine,
      addressLocality: HOTEL.location.town,
      addressRegion: HOTEL.location.county,
      addressCountry: HOTEL.location.country,
    },
    sameAs: HOTEL.socials.map((social) => social.href),
  };
  const replacements: Array<[RegExp, string]> = [
    [/__HOTEL_NAME__/g, HOTEL.name],
    [/__HOTEL_MONOGRAM__/g, HOTEL.monogram],
    [/__HOTEL_LOCATION__/g, location],
    [/__HOTEL_DESCRIPTION__/g, description],
    [/__HOTEL_WEBSITE_URL__/g, HOTEL.websiteUrl],
    [/__HOTEL_JSON_LD__/g, JSON.stringify(structuredData).replace(/</g, '\\u003c')],
  ];

  return {
    name: 'brand-html',
    transformIndexHtml(html) {
      return replacements.reduce(
        (output, [pattern, value]) => output.replace(pattern, value),
        html,
      );
    },
  };
}

/**
 * Generate `robots.txt` and `sitemap.xml` from the brand configuration so the
 * live domain never has to be hard-coded in public assets.
 */
function seoFiles(): Plugin {
  const publicPaths = [
    '/',
    '/rooms',
    '/booking',
    '/facilities',
    '/dining',
    '/conference',
    '/gym',
    '/offers',
    '/contact',
  ];
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...publicPaths.map(
      (path) =>
        `  <url><loc>${HOTEL.websiteUrl}${path === '/' ? '/' : path}</loc></url>`,
    ),
    '</urlset>',
    '',
  ].join('\n');
  const robots = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /dashboard',
    'Disallow: /booking/manage',
    '',
    `Sitemap: ${HOTEL.websiteUrl}/sitemap.xml`,
    '',
  ].join('\n');

  return {
    name: 'seo-files',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });
    },
    configureServer(server) {
      server.middlewares.use('/robots.txt', (_request, response) => {
        response.setHeader('Content-Type', 'text/plain; charset=utf-8');
        response.end(robots);
      });
      server.middlewares.use('/sitemap.xml', (_request, response) => {
        response.setHeader('Content-Type', 'application/xml; charset=utf-8');
        response.end(sitemap);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), brandHtml(), seoFiles()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
