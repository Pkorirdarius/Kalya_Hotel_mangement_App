import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { installApiMocks } from './mocks';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

interface AxeViolation {
  id: string;
  nodes: Array<{ target: string[] }>;
}

test.beforeEach(async ({ page }) => {
  await installApiMocks(page);
});

test('(f) axe finds no WCAG A/AA violations on the home page', async ({ page }) => {
  await page.goto('/');
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
});

test('(f) keyboard users can skip directly to main content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveAttribute('href', '#main');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});

test('(f) reduced motion disables transitions and entrance animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const transitionMs = await page
    .locator('.nav-link')
    .first()
    .evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration) * 1000);
  const animationMs = await page
    .locator('.animate-fade-up')
    .first()
    .evaluate((element) => parseFloat(getComputedStyle(element).animationDuration) * 1000);

  expect(transitionMs).toBeLessThanOrEqual(1);
  expect(animationMs).toBeLessThanOrEqual(1);
});
