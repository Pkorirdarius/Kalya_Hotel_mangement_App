import { expect, test } from '@playwright/test';
import { gotoApp } from './helpers';
import { installApiMocks, type ApiCall } from './mocks';

async function signIn(page: import('@playwright/test').Page, username: string) {
  await gotoApp(page, '/dashboard');
  await expect(page.getByRole('heading', { name: 'Staff sign in' })).toBeVisible();
  await page.getByLabel('Username or email').fill(username);
  await page.getByLabel('Password').fill('e2e-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test('(e) front desk signs in, works the queue and can undo an action', async ({ page }) => {
  const { calls } = await installApiMocks(page);
  await signIn(page, 'front_desk');

  await expect(page.getByRole('heading', { name: /, Asha\.$/ })).toBeVisible();
  await expect(page.getByText('Asha Njoroge').first()).toBeVisible();
  await expect(page.getByText('Front desk').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Today at a glance' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Confirm Asha Njoroge' }).click();
  await expect(page.getByRole('button', { name: /Undo/i })).toBeVisible();

  await expect
    .poll(() =>
      calls.some(
        (call: ApiCall) =>
          call.method === 'POST' &&
          call.path === '/staff/frontdesk/actions/' &&
          (call.body as Record<string, unknown> | undefined)?.action === 'confirm',
      ),
    )
    .toBe(true);

  await page.getByRole('button', { name: /Undo/i }).click();
  await expect
    .poll(() =>
      calls.some(
        (call: ApiCall) =>
          call.method === 'POST' &&
          call.path === '/staff/frontdesk/actions/' &&
          (call.body as Record<string, unknown> | undefined)?.action === 'undo',
      ),
    )
    .toBe(true);
});

test('(e) role capabilities control the reports panel', async ({ page }) => {
  await installApiMocks(page, { authenticated: true, role: 'director' });
  await gotoApp(page, '/dashboard');
  await expect(page.getByRole('heading', { name: 'Today at a glance' })).toBeVisible();
  await expect(page.getByText('Director').first()).toBeVisible();

  await page.getByRole('button', { name: /Sign out/i }).click();
  await expect(page.getByRole('heading', { name: 'Staff sign in' })).toBeVisible();
});
