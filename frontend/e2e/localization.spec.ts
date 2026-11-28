import { expect, test } from '@playwright/test';
import { gotoApp } from './helpers';
import { installApiMocks } from './mocks';

test('(d) switches EN/SW without losing the current page or query string', async ({ page }) => {
  await installApiMocks(page);
  await gotoApp(page, '/rooms?guests=2');

  await expect(page.getByRole('link', { name: 'Rooms' }).first()).toBeVisible();
  await page.locator('[data-language-switch]').first().click();

  await expect(page).toHaveURL(/\/sw\/rooms\?guests=2$/);
  await expect(page.getByRole('link', { name: 'Vyumba' }).first()).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /westpremierhotel\.co\.ke\/sw\/rooms/,
  );

  await page.locator('[data-language-switch]').first().click();
  await expect(page).toHaveURL(/\/rooms\?guests=2$/);
  await expect(page.getByRole('link', { name: 'Rooms' }).first()).toBeVisible();
});

test('(d) a stored language preference never redirects a crawler away from /sw', async ({
  page,
}) => {
  await page.addInitScript(() => window.localStorage.setItem('hotel.language', 'en'));
  await installApiMocks(page);
  await gotoApp(page, '/sw/booking');

  await expect(page).toHaveURL(/\/sw\/booking$/);
  await expect(page.getByRole('heading', { name: /Kukaa kwako, hatua kwa hatua/i })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /westpremierhotel\.co\.ke\/sw\/booking/,
  );
});
