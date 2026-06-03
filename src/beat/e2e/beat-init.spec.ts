import { test, expect } from '@playwright/test';

test.describe('Find the Beat - redirect to Stanza', () => {
  test('redirects /beat/ to Stanza', async ({ page }) => {
    await page.goto('/beat/');
    await page.waitForURL(/\/stanza\//);
    await expect(page.locator('#root')).toBeVisible();
  });
});
