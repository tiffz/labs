import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';

/**
 * Originals CUJ: Song view → Brainstorm notes chip opens the brainstorm editor.
 * @see src/encore/CUJs.md
 */
test.describe('Encore Originals brainstorm chip', () => {
  test('song view chip opens brainstorm stage', async ({ page }) => {
    await enterEncoreApp(page);
    await page.goto('/encore/#/originals');
    await expect(page.getByRole('heading', { name: 'Originals' })).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'New Original' }).click();
    const titleField = page.getByPlaceholder('Untitled original');
    await expect(titleField).toBeVisible({ timeout: 10_000 });
    await titleField.fill('E2E Brainstorm Chip');

    await page.getByRole('button', { name: 'View mode' }).click();
    await expect(page.getByText('Song files', { exact: true })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Open Brainstorm notes' }).click();
    await expect(page.getByLabel('Song brainstorm')).toBeVisible({ timeout: 10_000 });
  });
});
