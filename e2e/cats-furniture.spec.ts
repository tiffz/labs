import { test, expect } from '@playwright/test';

test.describe('Couch and scratching post render', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      type E2EWindow = Window & {
        labsAnalyticsInitialized?: boolean;
        gtag?: (...args: unknown[]) => void;
      };
      (window as unknown as E2EWindow).labsAnalyticsInitialized = true;
      (window as unknown as E2EWindow).gtag = () => {};
    });
    await page.route('**/*googletagmanager.com/**', r => r.fulfill({ status: 204 }));
    await page.route('**/*google-analytics.com/**', r => r.fulfill({ status: 204 }));
  });

  test('renders couch and scratching post without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', e => errors.push(String(e)));

    await page.goto('/cats/?overlay=0');
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('.world-viewport-container')).toBeVisible();

    await expect(page.locator('div[aria-label="couch"]')).toBeVisible();
    await expect(page.locator('div[aria-label="scratching-post"]')).toBeVisible();

    const severe = errors.filter(e => !/google-analytics|googletagmanager/.test(e));
    expect(severe, severe.join('\n')).toHaveLength(0);
  });
});


