import { test, expect } from '@playwright/test';

test.describe('Legacy Find the Beat route', () => {
  test('redirects /beat/ to Stanza', async ({ page }) => {
    await page.goto('/beat/?v=dQw4w9WgXcQ');
    await expect(page).toHaveURL(/\/stanza\/\?v=dQw4w9WgXcQ/);
  });
});
