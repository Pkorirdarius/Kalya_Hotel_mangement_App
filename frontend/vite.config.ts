import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { hotelFromEnv, type BrandConfig } from './src/config/hotel';
import { buildRobots, buildSitemap } from './src/lib/seo';

/**
 * Injects brand values into index.html at dev/build time so no brand string
 * is hard-coded in the HTML template. Values come from `VITE_HOTEL_*`
 * environment variables, with the documented placeholders as defaults.
 */
function brandHtml(brand: BrandConfig): Plugin {
  const location = `${brand.location.town}, ${brand.location.county}`;
  const description = `${brand.name} in ${location}. Warm, independent rooms, farm-to-table dining, conference facilities and a fitness studio. Book direct for the best rate.`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    '@id': `${brand.websiteUrl}/#hotel`,
    name: brand.name,
    legalName: brand.legalName,
    url: brand.websiteUrl,
    telephone: brand.contact.phoneDisplay,
    email: brand.contact.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: brand.location.addressLine,
      addressLocality: brand.location.town,
      addressRegion: brand.location.county,
      addressCountry: brand.location.country,
    },
    sameAs: brand.socials.map((social) => social.href),
  };
  const replacements: Array<[RegExp, string]> = [
    [/__HOTEL_NAME__/g, brand.name],
    [/__HOTEL_MONOGRAM__/g, brand.monogram],
    [/__HOTEL_LOCATION__/g, location],
    [/__HOTEL_DESCRIPTION__/g, description],
    [/__HOTEL_WEBSITE_URL__/g, brand.websiteUrl],
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
function seoFiles(brand: BrandConfig): Plugin {
  const sitemap = buildSitemap(undefined, brand.websiteUrl);
  const robots = buildRobots(brand.websiteUrl);

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

export default defineConfig(({ mode }) => {
  const brand = hotelFromEnv(loadEnv(mode, process.cwd(), 'VITE_'));

  return {
    plugins: [react(), brandHtml(brand), seoFiles(brand)],
    server: {
      port: 5173,
      strictPort: true,
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
