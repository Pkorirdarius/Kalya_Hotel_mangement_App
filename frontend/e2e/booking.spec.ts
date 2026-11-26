import { expect, test } from '@playwright/test';
import { completeSandboxPayment, reachPaymentStep, submitPayment } from './helpers';
import { installApiMocks, TEST_BOOKING_REFERENCE, type ApiCall } from './mocks';

function callBody(call: ApiCall | undefined): Record<string, unknown> {
  return (call?.body ?? {}) as Record<string, unknown>;
}

test('(a) searches availability, quotes, reserves and confirms a booking', async ({ page }) => {
  const { calls } = await installApiMocks(page);
  await reachPaymentStep(page);
  await submitPayment(page, 'mpesa');

  await expect(page.getByText(TEST_BOOKING_REFERENCE).first()).toBeVisible();

  const availability = calls.find(
    (call) => call.method === 'GET' && call.path === '/bookings/availability/',
  );
  expect(availability).toBeDefined();

  const quote = calls.find(
    (call) => call.method === 'POST' && call.path === '/bookings/quote/',
  );
  expect(callBody(quote)).toMatchObject({
    room_type: 'superior',
    meal_plan: 'breakfast',
    guests: 2,
  });

  const reservation = calls.find(
    (call) => call.method === 'POST' && call.path === '/bookings/',
  );
  expect(callBody(reservation)).toMatchObject({
    first_name: 'E2E',
    last_name: 'Guest',
    email: 'guest@example.test',
    country: 'Kenya',
    language: 'en',
    consent_privacy: true,
  });

  const initiate = calls.find(
    (call) => call.method === 'POST' && call.path.startsWith('/payments/bookings/'),
  );
  expect(callBody(initiate)).toMatchObject({ method: 'mpesa' });

  await completeSandboxPayment(page);
  await expect(page.getByRole('link', { name: 'Manage this booking' })).toBeVisible();
});
