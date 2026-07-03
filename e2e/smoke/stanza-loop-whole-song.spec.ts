import { expect, test } from '@playwright/test';
import { clickStanzaLibraryCard } from '../helpers/stanzaLibrary';
import { STANZA_E2E_LOOP_SONG_TITLE } from '../../src/stanza/e2e/stanzaE2eBootstrap';

test.describe('Stanza loop whole song', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('STANZA_E2E_HOOKS', '1');
    });
    await page.goto('/stanza/');
    await page.waitForFunction(
      () => typeof window !== 'undefined' && (window as Window & { __stanzaE2e?: unknown }).__stanzaE2e != null,
    );
    await page.evaluate(async () => {
      const w = window as Window & { __stanzaE2e?: { seedSongWithLoopPlayback: () => Promise<string> } };
      await w.__stanzaE2e!.seedSongWithLoopPlayback();
    });
    await clickStanzaLibraryCard(page, STANZA_E2E_LOOP_SONG_TITLE);
    await expect(page.locator('.stanza-playback-stack')).toBeVisible({ timeout: 15_000 });
  });

  test('loop whole song wraps near the end without pausing', async ({ page }) => {
    await page.getByRole('button', { name: 'Loop whole song' }).click();
    await page.locator('button.stanza-play-btn').click();

    await page.waitForFunction(() => {
      const audio = document.querySelector('audio.stanza-local-audio') as HTMLAudioElement | null;
      return audio != null && !audio.paused && audio.duration > 1;
    });

    await page.waitForFunction(
      () => {
        const audio = document.querySelector('audio.stanza-local-audio') as HTMLAudioElement | null;
        if (!audio || audio.paused) return false;
        return audio.currentTime >= audio.duration - 0.35;
      },
      undefined,
      { timeout: 15_000 },
    );

    await page.waitForFunction(
      () => {
        const audio = document.querySelector('audio.stanza-local-audio') as HTMLAudioElement | null;
        if (!audio || audio.paused) return false;
        return audio.currentTime < 0.35;
      },
      undefined,
      { timeout: 15_000 },
    );
  });
});
