import { expect, test } from '@playwright/test';
import { reachPaymentStep, submitPayment } from './helpers';
import { installApiMocks, type ApiCall } from './mocks';

const methods = [
  { ui: 'mpesa', backend: 'mpesa', note: /M-Pesa phone number/i },
  { ui: 'card', backend: 'card', note: /Visa\s*·\s*Mastercard/i },
  { ui: 'bank', backend: 'bank_transfer', note: /E2E Bank/i },
] as const;

for (const method of methods) {
  test(`(b) starts the ${method.ui} payment path with the backend method ${method.backend}`, async ({
    page,
  }) => {
    const { calls } = await installApiMocks(page);
    await reachPaymentStep(page);

    if (method.ui === 'mpesa') {
      await expect(page.getByLabel(/M-Pesa phone number/i)).toBeVisible();
    }
    if (method.ui === 'card') {
      await expect(page.getByText(method.note)).toBeVisible();
    }

    await submitPayment(page, method.ui);

    const initiate = calls.find(
      (call: ApiCall) =>
        call.method === 'POST' && call.path.startsWith('/payments/bookings/'),
    );
    expect((initiate?.body as Record<string, unknown> | undefined)?.method).toBe(method.backend);

    if (method.ui === 'bank') {
      await expect(page.getByText('E2E Bank').first()).toBeVisible();
      await expect(
        page.getByRole('button', { name: /Reserve with bank transfer/i }),
      ).toHaveCount(0);
    }
    await expect(page.getByText('Payment pending').first()).toBeVisible();
  });
}
