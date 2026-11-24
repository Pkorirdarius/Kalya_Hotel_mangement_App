import { expect, test } from '@playwright/test';
import { gotoApp } from './helpers';
import { installApiMocks, TEST_BOOKING_REFERENCE, type ApiCall } from './mocks';

test('(c) looks up a booking and cancels it with confirmation', async ({ page }) => {
  const { calls } = await installApiMocks(page, { bookingStatus: 'confirmed' });
  await gotoApp(page, `/booking/manage?reference=${TEST_BOOKING_REFERENCE}`);

  await page.getByLabel('Email address').fill('guest@example.test');
  await page.getByRole('button', { name: /Find booking/i }).click();

  await expect(page.getByText(TEST_BOOKING_REFERENCE).first()).toBeVisible();
  await expect(page.getByText('Confirmed').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Cancel this booking/i })).toBeVisible();

  const lookup = calls.find(
    (call: ApiCall) =>
      call.method === 'GET' && call.path === `/bookings/${TEST_BOOKING_REFERENCE}/`,
  );
  expect(lookup).toBeDefined();

  await page.getByRole('button', { name: /Cancel this booking/i }).click();
  await page.getByLabel(/Reason/i).fill('E2E cancellation');
  await page.getByRole('button', { name: /Yes, cancel booking/i }).click();

  await expect(page.getByText('Booking cancelled').first()).toBeVisible();
  await expect(page.getByText('Cancelled').first()).toBeVisible();

  const cancel = calls.find(
    (call: ApiCall) =>
      call.method === 'POST' &&
      call.path === `/bookings/${TEST_BOOKING_REFERENCE}/cancel/`,
  );
  expect((cancel?.body as Record<string, unknown> | undefined)?.reason).toBe(
    'E2E cancellation',
  );
});

test('(c) shows a clear message when the booking is not found', async ({ page }) => {
  await installApiMocks(page, { bookingNotFound: true });
  await gotoApp(page, `/booking/manage?reference=${TEST_BOOKING_REFERENCE}`);

  await page.getByLabel('Email address').fill('guest@example.test');
  await page.getByRole('button', { name: /Find booking/i }).click();
  await expect(page.getByRole('alert')).toContainText(/could not find|not found/i);
});
