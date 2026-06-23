import { test, expect } from '@playwright/test';
import { measureClickUntil } from '../helpers/interactionLatency';
import { AUDIO_PLAY_INTERACTION_BUDGET_MS } from '../../src/shared/test/interactionLatencyCore';

test.describe('Darbuka load + interaction', () => {
  test('shows rhythm input before staff finishes loading', async ({ page }) => {
    await page.goto('/drums/');
    const input = page.getByPlaceholder('D-T-__T-D---T---');
    await expect(input).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Darbuka Rhythm Trainer' })).toBeVisible();
  });

  test('play responds quickly after audio warmup', async ({ page }) => {
    await page.goto('/drums/');
    await expect(page.getByPlaceholder('D-T-__T-D---T---')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.vexflow-container, .staff-loading-placeholder').first()).toBeVisible({
      timeout: 15000,
    });

    const playButton = page.getByRole('button', { name: /Play rhythm/i });
    const stopButton = page.getByRole('button', { name: /Stop playback/i });
    await expect(playButton).toBeEnabled({ timeout: 10000 });

    await playButton.click();
    await expect(stopButton).toBeVisible({ timeout: 10000 });
    await stopButton.click();
    await expect(playButton).toBeVisible();

    const ms = await measureClickUntil(page, playButton, async () => {
      await expect(stopButton).toBeVisible();
    });
    expect(ms).toBeLessThanOrEqual(AUDIO_PLAY_INTERACTION_BUDGET_MS);
  });
});
