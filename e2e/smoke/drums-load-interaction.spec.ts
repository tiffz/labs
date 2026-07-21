import { test, expect } from '@playwright/test';
import { measureClickUntil, reportInteractionLatency } from '../helpers/interactionLatency';
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
    reportInteractionLatency(ms, AUDIO_PLAY_INTERACTION_BUDGET_MS, 'play after warmup');
  });

  // The loop-selection highlight lives inside the notation SVG and is only drawn
  // by the render effect, so a re-render landing during playback (e.g. editing
  // BPM while a section loops) could drop it while the loop kept playing. The
  // render effect now self-heals: an active selection whose highlight is missing
  // is redrawn on the next playback tick. Simulate the drop directly.
  test('loop selection highlight persists (self-heals) during playback', async ({ page }) => {
    await page.goto('/drums/');
    const staff = page.locator('.vexflow-container svg').first();
    await expect(staff).toBeVisible({ timeout: 15000 });
    await page.locator('.vexflow-container svg text').first().waitFor({ timeout: 15000 });

    // Drag across the first stave to create a loop selection.
    const box = await staff.boundingBox();
    if (!box) throw new Error('notation staff has no bounding box');
    const y = box.y + box.height * 0.45;
    await page.mouse.move(box.x + 30, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, y, { steps: 10 });
    await page.mouse.up();
    const highlight = page.locator('.vexflow-container svg .selection-highlight');
    await expect(highlight).toHaveCount(1, { timeout: 5000 });

    await page.getByRole('button', { name: /Play rhythm/i }).click();
    await expect(page.getByRole('button', { name: /Stop playback/i })).toBeVisible({ timeout: 10000 });

    // Force the highlight to vanish, as a stray re-render would, mid-loop.
    await page.evaluate(() =>
      document
        .querySelectorAll('.vexflow-container svg .selection-highlight')
        .forEach((n) => n.remove()),
    );
    // A playback tick must bring it back — and exactly one, never duplicated.
    await expect(highlight).toHaveCount(1, { timeout: 5000 });
    await page.waitForTimeout(400);
    await expect(highlight).toHaveCount(1);
  });
});
