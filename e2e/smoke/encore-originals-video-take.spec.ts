import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';
import { gotoEncoreOriginalsQueue } from '../helpers/encoreOriginalsQueue';

const MOV = path.join(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/encore-take.mov');

test.describe('Encore Originals video take', () => {
  test('a .mov uploads as a take and plays', async ({ page }) => {
    await enterEncoreApp(page);
    await gotoEncoreOriginalsQueue(page);
    await page.getByText('E2E Queue A', { exact: true }).click();
    await page.getByRole('button', { name: 'Record takes' }).click();

    const picker = page.locator('input[type="file"][multiple]');
    await expect(picker).toHaveAttribute('accept', /\.mov/);
    await picker.setInputFiles(MOV);

    // Picking only stages the file; it is added when the user confirms.
    const review = page.getByRole('region', { name: 'Takes ready to add' });
    await expect(review.getByText('encore-take.mov')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Take name' })).toHaveCount(1);
    await review.getByRole('button', { name: 'Add take' }).click();

    const row = page.getByRole('listitem').filter({
      has: page.getByRole('textbox', { name: 'Take name' }).and(page.locator('[value="encore-take.mov"]')),
    });
    await expect(row).toHaveCount(1, { timeout: 10_000 });

    // A video take plays in the floating video player, not the hidden <audio>.
    await row.getByRole('button', { name: 'Play take' }).click();
    const video = page.locator('.encore-media-playback-drive-video-float video');
    await expect(video).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 10_000 })
      .toBeGreaterThan(0);
  });
});
