import { test, expect } from '@playwright/test';

test.describe('Words in rhythm bootstrap', () => {
  test('loads app shell and rhythm input', async ({ page }) => {
    await page.goto('/words/');
    await expect(page).toHaveTitle(/Words in Rhythm/i);
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Words in Rhythm');
  });
});
