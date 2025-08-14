import { test, expect } from '@playwright/test';

test.describe('Cats app bootstrap', () => {
  test('initializes without major console errors', async ({ page }) => {
    // Stub external noise before navigation
    await page.addInitScript(() => {
      type E2EWindow = Window & {
        __E2E__?: boolean;
        labsAnalyticsInitialized?: boolean;
        gtag?: (...args: unknown[]) => void;
      };
      (window as unknown as E2EWindow).__E2E__ = true;
      (window as unknown as E2EWindow).labsAnalyticsInitialized = true;
      (window as unknown as E2EWindow).gtag = () => {};
    });

    await page.route('**/*googletagmanager.com/**', route => route.fulfill({ status: 204, contentType: 'text/plain', body: '' }));
    await page.route('**/*google-analytics.com/**', route => route.fulfill({ status: 204, contentType: 'text/plain', body: '' }));
    await page.route('**/*fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '/* fonts disabled in e2e */' }));
    await page.route('**/*fonts.gstatic.com/**', route => route.fulfill({ status: 204, contentType: 'font/woff2', body: '' }));
    await page.route('**/scripts/analytics.js', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.__E2E__=true;window.labsAnalyticsInitialized=true;window.gtag=function(){};console.log("GA disabled in E2E");' }));
    await page.route('**/__debug_log', route => route.fulfill({ status: 204 }));
    await page.route('**/__debug_snapshot', route => route.fulfill({ status: 204 }));

    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(String(err)));
    page.on('requestfailed', req => {
      const url = req.url();
      if (/google-analytics|googletagmanager|fonts\.googleapis|fonts\.gstatic/.test(url)) return;
      errors.push(`requestfailed ${url}: ${req.failure()?.errorText}`);
    });

    await page.goto('/cats/');

    // Sanity: core containers render
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('.world-viewport-container')).toBeVisible();

    await page.waitForTimeout(1000);

    const severe = errors.filter(e => !/google-analytics|googletagmanager|fonts\.googleapis|fonts\.gstatic/.test(e));
    expect(severe, severe.join('\n')).toHaveLength(0);
  });
});


