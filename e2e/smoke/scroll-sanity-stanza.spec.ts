import { test, expect } from '@playwright/test';
import { runScrollSanityInBrowser } from '../helpers/scrollSanity';

test.describe('Stanza scroll sanity', () => {
  test('library route scrolls vertically', async ({ page }) => {
    await page.goto('/stanza/');
    await expect(page.locator('main#main')).toBeVisible({ timeout: 15_000 });

    const result = await page.evaluate(runScrollSanityInBrowser, {});
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });
});
