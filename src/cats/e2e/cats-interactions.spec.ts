import { test, expect } from '@playwright/test';

test.describe('Cats basic interactions', () => {
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
    await page.route('**/*fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await page.route('**/*fonts.gstatic.com/**', r => r.fulfill({ status: 204 }));
  });

  test('click cat and toggle wand without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', e => errors.push(String(e)));

    await page.goto('/cats/');
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('.world-viewport-container')).toBeVisible();

    // Toggle wand mode via keyboard
    await page.keyboard.press('w');
    await page.waitForTimeout(200);

    // Click roughly at screen center to simulate pet
    const vp = page.locator('.world-viewport-container');
    const box = await vp.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }

    // No app-level errors captured
    const severe = errors.filter(e => !/google-analytics|googletagmanager|fonts\.googleapis|fonts\.gstatic/.test(e));
    expect(severe, severe.join('\n')).toHaveLength(0);
  });
});


