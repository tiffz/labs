import { expect, type Page } from '@playwright/test';

/** Assert Zine Box library chrome before actions that navigate away from `#/library`. */
export async function expectZineboxLibraryChrome(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="zinebox-library"]')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: /Upload zines/i })).toBeVisible({ timeout: 15000 });
}
