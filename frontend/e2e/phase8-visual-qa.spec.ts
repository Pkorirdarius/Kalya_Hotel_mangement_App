import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { gotoApp } from './helpers';
import { installApiMocks } from './mocks';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

interface AxeViolation {
  id: string;
  nodes: Array<{ target: string[] }>;
}

test.use({ viewport: { width: 360, height: 780 } });

test.beforeEach(async ({ page }) => {
  // Settled contrast is the state a guest sees; entrance animations are
  // deliberately frozen for the accessibility pass.
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const widths = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
  expect(widths.body).toBeLessThanOrEqual(widths.viewport + 1);
}

async function expectNoAxeViolations(page: Page): Promise<void> {
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            context: Document,
            options: unknown,
          ) => Promise<{ violations: AxeViolation[] }>;
        };
      }
    ).axe;
    return axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });
  });
  const violations = result.violations.map((violation) => ({
    id: violation.id,
    targets: violation.nodes.map((node) => node.target.join(' ')),
  }));
  expect(violations).toEqual([]);
}

for (const path of ['/rooms', '/sw/rooms']) {
  test(`(h) ${path} fits 360 px and passes axe`, async ({ page }) => {
    await installApiMocks(page);
    await gotoApp(page, path);

    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.getByRole('link', { name: /book|weka|nafasi/i }).first()).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoAxeViolations(page);
  });
}

test('(h) booking room step fits 360 px and shows the sold-out state', async ({ page }) => {
  await installApiMocks(page, { soldOutRoomTypes: ['deluxe'] });
  await gotoApp(page, '/booking');
  await page.getByRole('button', { name: /Choose a room/i }).click();

  await expect(page.getByRole('heading', { name: /Pick your room and meal plan/i })).toBeVisible();
  await expect(
    page.getByText('Room not available — choose another room').first(),
  ).toBeVisible();
  await expect(page.locator('input[name="room"][value="deluxe"]')).toBeDisabled();
  await expectNoHorizontalScroll(page);
  await expectNoAxeViolations(page);
});

test('(h) dashboard room panel fits 360 px and keeps status toggles usable', async ({ page }) => {
  await installApiMocks(page, { authenticated: true, newBookingCount: 1 });
  await gotoApp(page, '/dashboard');

  await expect(page.getByRole('heading', { name: 'Room status' })).toBeVisible();
  await expect(
    page.getByText('New bookings · 1 received in the last 10 minutes.'),
  ).toBeVisible();
  await expect(page.getByRole('cell', { name: '201', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark occupied — room 201' })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectNoAxeViolations(page);
});
