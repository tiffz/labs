import { test, expect, type Page } from '@playwright/test';

const PREVIEW = '?labs_preview_cookie_banner=1';

function trackingUrls(url: string): boolean {
  return (
    url.includes('/scripts/analytics.js') ||
    url.includes('googletagmanager.com') ||
    url.includes('google-analytics.com')
  );
}

test.describe('Cookie consent (localhost preview)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearAnalyticsConsent(page);
  });

  test('does not load analytics until Accept; Reject never loads tracking', async ({ page }) => {
    const hits: string[] = [];
    page.on('request', (req) => {
      const u = req.url();
      if (trackingUrls(u)) hits.push(u);
    });

    await page.goto(`/${PREVIEW}`);
    await expect(page.getByRole('region', { name: 'Cookie consent' })).toBeVisible();

    // Banner visible — still no Labs analytics bundle or GTM.
    expect(hits.filter((u) => u.includes('/scripts/analytics.js'))).toHaveLength(0);
    expect(hits.filter((u) => u.includes('googletagmanager.com'))).toHaveLength(0);

    await page.getByRole('button', { name: 'Reject' }).click();
    await expect(page.locator('#labs-cookie-consent-root')).toHaveCount(0);

    await page.reload();
    await expect(page.locator('#labs-cookie-consent-root')).toHaveCount(0);
    expect(hits.filter((u) => u.includes('/scripts/analytics.js'))).toHaveLength(0);
    expect(hits.filter((u) => u.includes('googletagmanager.com'))).toHaveLength(0);

    await clearAnalyticsConsent(page);
    await page.goto(`/${PREVIEW}`);
    await expect(page.getByRole('region', { name: 'Cookie consent' })).toBeVisible();

    await Promise.all([
      page.waitForRequest((req) => req.url().includes('/scripts/analytics.js'), { timeout: 15_000 }),
      page.getByRole('button', { name: 'Accept' }).click(),
    ]);
    await page.waitForRequest((req) => req.url().includes('googletagmanager.com'), { timeout: 20_000 });
    expect(hits.some((u) => u.includes('googletagmanager.com'))).toBe(true);
  });

  test('stored Accept loads analytics on repeat visit (still with preview flag)', async ({
    page,
  }) => {
    await page.goto(`/${PREVIEW}`);
    await page.getByRole('button', { name: 'Accept' }).click();
    await expect(page.locator('#labs-cookie-consent-root')).toHaveCount(0);

    await page.goto(`/${PREVIEW}`);
    await expect(page.locator('#labs-cookie-consent-root')).toHaveCount(0);

    // Second visit may serve cached /scripts/analytics.js without a new request event;
    // assert GA bootstrap completed instead.
    await expect
      .poll(async () =>
        page.evaluate(() => Boolean((window as unknown as { labsAnalyticsInitialized?: boolean }).labsAnalyticsInitialized)),
      )
      .toBe(true);
  });
});

async function clearAnalyticsConsent(page: Page): Promise<void> {
  await page.evaluate(() => {
    try {
      localStorage.removeItem('labs_analytics_consent');
    } catch {
      /* ignore */
    }
  });
}
