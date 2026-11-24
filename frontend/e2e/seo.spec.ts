import { expect, test } from '@playwright/test';
import { gotoApp } from './helpers';
import { installApiMocks } from './mocks';

interface PageMetadata {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  hreflang: string[];
  jsonLd: string[];
  h1Count: number;
}

async function readMetadata(page: import('@playwright/test').Page): Promise<PageMetadata> {
  // `domcontentloaded` returns before React finishes rendering the h1.
  await page.locator('main h1').first().waitFor({ state: 'visible' });
  return page.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
    ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '',
    hreflang: Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).map(
      (element) => element.getAttribute('hreflang') ?? '',
    ),
    jsonLd: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(
      (element) => element.textContent ?? '',
    ),
    h1Count: document.querySelectorAll('h1').length,
  }));
}

test('(g) prerendered marketing pages carry unique, localized head metadata', async ({ page }) => {
  await installApiMocks(page);

  await gotoApp(page, '/');
  const home = await readMetadata(page);
  expect(home.title).toContain('West Premier Hotel');
  expect(home.description.length).toBeGreaterThan(40);
  expect(home.canonical).toMatch(/westpremierhotel\.co\.ke\/$/);
  expect(home.ogTitle).toContain('West Premier Hotel');
  expect(home.hreflang).toEqual(expect.arrayContaining(['en', 'sw']));
  expect(home.jsonLd.join('\n')).toContain('"@type":"Hotel"');
  expect(home.h1Count).toBe(1);

  await gotoApp(page, '/rooms');
  const rooms = await readMetadata(page);
  expect(rooms.title).not.toBe(home.title);
  expect(rooms.description).not.toBe(home.description);
  expect(rooms.canonical).toMatch(/westpremierhotel\.co\.ke\/rooms$/);
  expect(rooms.h1Count).toBe(1);

  await gotoApp(page, '/sw/rooms');
  const swRooms = await readMetadata(page);
  expect(swRooms.title).not.toBe(rooms.title);
  expect(swRooms.canonical).toMatch(/westpremierhotel\.co\.ke\/sw\/rooms$/);
  expect(swRooms.hreflang).toEqual(expect.arrayContaining(['en', 'sw']));
});

test('(g) private pages are noindex and absent from robots.txt and sitemap.xml', async ({
  page,
  request,
}) => {
  await installApiMocks(page);
  await gotoApp(page, '/booking/manage');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/,
  );

  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /booking/manage');
  expect(robots).toContain('Disallow: /sw/booking/manage');
  expect(robots).toContain('Sitemap: https://westpremierhotel.co.ke/sitemap.xml');

  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('<loc>https://westpremierhotel.co.ke/rooms</loc>');
  expect(sitemap).toContain('<loc>https://westpremierhotel.co.ke/sw/rooms</loc>');
  expect(sitemap).not.toContain('/booking/manage');
});
