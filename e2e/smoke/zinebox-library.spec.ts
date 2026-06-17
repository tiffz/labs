import { expect, test } from '@playwright/test';

test('zinebox library boots with upload UI', async ({ page }) => {
  await page.goto('/zinebox/?e2eSeed=1');
  await expect(page).toHaveTitle(/Zine Box/i);
  await expect(page.locator('[data-testid="zinebox-library"]')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: /Upload zines/i })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /Upload zines/i }).click();
  await expect(page.locator('[data-testid="zinebox-upload-zone"]')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: /Add PDF zines/i })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /Open a random unread zine/i })).toBeEnabled({
    timeout: 15000,
  });
  await page.getByRole('button', { name: /Open a random unread zine/i }).click();
  await expect(page).toHaveURL(/#\/read\//, { timeout: 15000 });
});
