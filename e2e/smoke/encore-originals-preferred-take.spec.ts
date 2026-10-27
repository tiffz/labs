import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';
import { gotoEncoreOriginalsQueue } from '../helpers/encoreOriginalsQueue';

/*
 * Seed song "E2E Queue B" has two playable takes; the SECOND is starred as preferred. The list's
 * play control must play the starred one, not the first playable take.
 */
const PREFERRED = 'E2E Queue B take';
const OTHER = 'E2E Queue B early take';

test.describe('Encore Originals list plays the preferred take', () => {
  test('table play control plays the starred take, not the first', async ({ page }) => {
    await enterEncoreApp(page);
    await gotoEncoreOriginalsQueue(page);

    const row = page.locator('tbody tr').filter({ hasText: 'E2E Queue B' });
    await row.getByRole('button', { name: 'Play demo' }).click();

    const subtitle = page.locator('.encore-media-playback-track-subtitle');
    await expect(subtitle).toHaveText(PREFERRED, { timeout: 10_000 });
    await expect(subtitle).not.toHaveText(OTHER);
    await expect(row.getByRole('button', { name: 'Stop demo' })).toBeVisible();
  });

  test('Play selected queues the starred take', async ({ page }) => {
    await enterEncoreApp(page);
    await gotoEncoreOriginalsQueue(page);

    const row = page.locator('tbody tr').filter({ hasText: 'E2E Queue B' });
    await row.locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: 'Play selected' }).click();

    await expect(page.locator('.encore-media-playback-track-subtitle')).toHaveText(PREFERRED, {
      timeout: 10_000,
    });
  });
});
