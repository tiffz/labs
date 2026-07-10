import { expect, test } from '@playwright/test';
import { clickStanzaLibraryCard } from '../helpers/stanzaLibrary';
import { STANZA_E2E_PLAYTHROUGH_SONG_TITLE } from '../../src/stanza/e2e/stanzaE2eBootstrap';

/**
 * Play-through trust gate: HTML5 can report a short metadata duration and fire `ended`
 * early. Stanza must resume using the decoded/fingerprint horizon and reach the real tail.
 */
test.describe('Stanza play through whole song', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('STANZA_E2E_HOOKS', '1');
      // Spoof short metadata duration on Stanza local audio (VBR-style premature end).
      const desc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'duration');
      Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
        configurable: true,
        get(this: HTMLMediaElement) {
          const real = desc?.get?.call(this) as number;
          if (
            this.classList?.contains('stanza-local-audio') &&
            Number.isFinite(real) &&
            real > 2.2
          ) {
            return 2;
          }
          return real;
        },
      });
    });
    await page.goto('/stanza/');
    await page.waitForFunction(
      () => typeof window !== 'undefined' && (window as Window & { __stanzaE2e?: unknown }).__stanzaE2e != null,
    );
    await page.evaluate(async () => {
      const w = window as Window & { __stanzaE2e?: { seedSongWithPlaythrough: () => Promise<string> } };
      await w.__stanzaE2e!.seedSongWithPlaythrough();
    });
    await clickStanzaLibraryCard(page, STANZA_E2E_PLAYTHROUGH_SONG_TITLE);
    await expect(page.locator('.stanza-playback-stack')).toBeVisible({ timeout: 15_000 });
  });

  test('play through resumes past short metadata and reaches the real tail', async ({ page }) => {
    await page.getByRole('button', { name: 'Play through (loop off)' }).click();
    await page.locator('button.stanza-play-btn').click();

    await page.waitForFunction(() => {
      const audio = document.querySelector('audio.stanza-local-audio') as HTMLAudioElement | null;
      return audio != null && !audio.paused && Number.isFinite(audio.duration) && audio.duration > 0;
    });

    // Confirm spoof is active (reported duration is short).
    const spoofed = await page.locator('audio.stanza-local-audio').evaluate((el) => (el as HTMLAudioElement).duration);
    expect(spoofed).toBeLessThanOrEqual(2.05);

    // Fire premature ended at the spoofed freeze point while still mid-file.
    await page.locator('audio.stanza-local-audio').evaluate((el) => {
      const audio = el as HTMLAudioElement;
      audio.currentTime = Math.max(0, audio.duration - 0.02);
      audio.dispatchEvent(new Event('ended'));
    });

    // Must keep playing and advance past the spoofed metadata end.
    await page.waitForFunction(
      () => {
        const audio = document.querySelector('audio.stanza-local-audio') as HTMLAudioElement | null;
        if (!audio || audio.paused) return false;
        return audio.currentTime > 2.15;
      },
      undefined,
      { timeout: 10_000 },
    );

    // Eventually reach the real tail (decoded ~3s) and stop in play-through mode.
    await page.waitForFunction(
      () => {
        const audio = document.querySelector('audio.stanza-local-audio') as HTMLAudioElement | null;
        if (!audio) return false;
        return audio.paused && audio.currentTime >= 2.7;
      },
      undefined,
      { timeout: 15_000 },
    );
  });
});
