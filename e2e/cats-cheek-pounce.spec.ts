import { test, expect } from '@playwright/test';

test.describe('Cats cheek pet and pounce flow', () => {
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

  test('rapid cheek pets do not error and can trigger jump', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', e => errors.push(String(e)));

    await page.goto('/cats/?overlay=0');
    await expect(page.locator('#root')).toBeVisible();
    await page.waitForTimeout(300);

    const vp = page.locator('.world-viewport-container');
    const box = await vp.boundingBox();
    if (box) {
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      // Burst of clicks to trigger happy jump
      for (let i = 0; i < 4; i++) {
        await page.mouse.click(cx, cy);
        await page.waitForTimeout(120);
      }
    }

    const severe = errors.filter(e => !/google-analytics|googletagmanager|fonts\.googleapis|fonts\.gstatic/.test(e));
    expect(severe, severe.join('\n')).toHaveLength(0);
  });
});


