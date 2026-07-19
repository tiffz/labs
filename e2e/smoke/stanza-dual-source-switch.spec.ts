import { expect, test } from '@playwright/test';
import { clickStanzaLibraryCard } from '../helpers/stanzaLibrary';
import { STANZA_E2E_DUAL_SOURCE_SONG_TITLE } from '../../src/stanza/e2e/stanzaE2eBootstrap';

/**
 * Dual-source songs (YouTube + uploaded file) must keep the transport horizon
 * across a source round-trip. Regression: switching YouTube ↔ uploaded reset
 * the known duration, collapsing the timeline (unit: stanzaPracticeSourceSwitch.test.ts).
 */
test.describe('Stanza dual-source switch', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('STANZA_E2E_HOOKS', '1');
    });
    await page.goto('/stanza/');
    await page.waitForFunction(
      () => typeof window !== 'undefined' && (window as Window & { __stanzaE2e?: unknown }).__stanzaE2e != null,
    );
    await page.evaluate(async () => {
      const w = window as Window & { __stanzaE2e?: { seedSongWithDualSources: () => Promise<string> } };
      await w.__stanzaE2e!.seedSongWithDualSources();
    });
    await clickStanzaLibraryCard(page, STANZA_E2E_DUAL_SOURCE_SONG_TITLE);
    await expect(page.locator('.stanza-playback-stack')).toBeVisible({ timeout: 15_000 });
  });

  test('YouTube round-trip keeps the uploaded transport horizon', async ({ page }) => {
    const sourceSwitch = page.getByRole('group', { name: 'Practice source' });
    await expect(sourceSwitch).toBeVisible();

    // Local audio mounted with its real duration before switching away.
    await page.waitForFunction(() => {
      const audio = document.querySelector('audio.stanza-local-audio') as HTMLAudioElement | null;
      return audio != null && Number.isFinite(audio.duration) && audio.duration > 2.5;
    });

    await sourceSwitch.getByRole('button', { name: 'YouTube' }).click();
    await expect(sourceSwitch.getByRole('button', { name: 'YouTube' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // Local element unmounts while the YouTube source is active.
    await expect(page.locator('audio.stanza-local-audio')).toHaveCount(0);

    await sourceSwitch.getByRole('button', { name: 'Uploaded file' }).click();
    await expect(sourceSwitch.getByRole('button', { name: 'Uploaded file' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Horizon restored: the remounted local audio reports the full duration again.
    await page.waitForFunction(() => {
      const audio = document.querySelector('audio.stanza-local-audio') as HTMLAudioElement | null;
      return audio != null && Number.isFinite(audio.duration) && audio.duration > 2.5;
    });
    // Timeline still shows a usable transport (no collapsed/zero horizon).
    await expect(page.locator('.stanza-playback-stack')).toBeVisible();
  });
});
