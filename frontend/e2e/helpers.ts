import { expect, type Page } from '@playwright/test';

/** Navigate without waiting on third-party fonts/images to finish loading. */
export async function gotoApp(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // The prerendered HTML is interactive only after React attaches. Waiting for
  // the root container's React handle avoids racing keyboard focus and handlers.
  await page.waitForFunction(() => {
    const root = document.getElementById('root');
    return !!root && Object.keys(root).some((key) => key.startsWith('__reactContainer'));
  });
}

/** Walk the real booking wizard from dates through to the payment step. */
export async function reachPaymentStep(page: Page): Promise<void> {
  await gotoApp(page, '/booking');
  await expect(page.getByRole('heading', { name: /Your stay, step by step/i })).toBeVisible();

  await page.getByRole('button', { name: /Choose a room/i }).click();
  await expect(page.getByRole('heading', { name: /Pick your room and meal plan/i })).toBeVisible();
  await expect(page.getByText('Superior Room').first()).toBeVisible();

  await page.getByRole('button', { name: /Add guest details/i }).click();
  await expect(page.getByRole('heading', { name: /Who is staying with us/i })).toBeVisible();

  await page.getByLabel('First name').fill('E2E');
  await page.getByLabel('Last name').fill('Guest');
  await page.getByLabel('Email address').fill('guest@example.test');
  await page.getByLabel('Phone number').fill('+254712345678');
  await page.locator('#terms').check();
  await page.getByRole('button', { name: /Continue to payment/i }).click();
  await expect(page.getByRole('heading', { name: /How would you like to pay/i })).toBeVisible();
}

/** Select a method and submit the booking/payment step. */
export async function submitPayment(
  page: Page,
  method: 'mpesa' | 'card' | 'bank',
): Promise<void> {
  if (method !== 'mpesa') {
    // The radio input is visually hidden inside a clickable <label>, so click
    // the label the way a guest would instead of forcing a check on the input.
    await page.locator(`label:has(input[name="payment"][value="${method}"])`).click();
  }
  const payButton = page.getByRole('button', {
    name: method === 'bank' ? /Reserve with bank transfer/i : /Pay & confirm booking/i,
  });
  await payButton.click();
  await expect(page.getByRole('heading', { name: /You are booked|Awaiting payment|Payment/i }).first()).toBeVisible();
}

/** Confirm the sandbox payment and wait for the success state. */
export async function completeSandboxPayment(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Simulate successful payment/i }).click();
  await expect(page.getByText('Payment received').first()).toBeVisible();
}
