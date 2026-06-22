import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';

test.describe('Encore Originals library bulk play', () => {
  test('table row selection and queue chip', async ({ page }) => {
    await enterEncoreApp(page);
    await page.goto('/encore/#/originals?e2eOriginalsQueue=1');
    await expect(page.getByRole('heading', { name: 'Originals' })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('tbody tr')).toHaveCount(2, { timeout: 20_000 });
    await expect(page.getByText('E2E Queue A')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('E2E Queue B')).toBeVisible();

    const rowCheckboxes = page.locator('tbody input[type="checkbox"]');
    await expect(rowCheckboxes.first()).toBeVisible({ timeout: 10_000 });
    await rowCheckboxes.nth(0).check();
    await rowCheckboxes.nth(1).check();

    await expect(page.getByText('2 selected')).toBeVisible();
    await page.getByRole('button', { name: 'Play selected' }).click();

    await expect(
      page.getByRole('button', { name: /Playback queue, item 1 of 2/i }),
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /Playback queue, item 1 of 2/i }).click();
    await expect(page.getByRole('heading', { name: 'Queue', level: 2 })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Playback queue' })).toBeVisible();
  });
});
