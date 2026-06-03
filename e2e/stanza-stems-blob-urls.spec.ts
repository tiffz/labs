import { test, expect } from '@playwright/test';

const STANZA_E2E_STEM_SONG_TITLE = 'E2E Stems Song';

test.describe('Stanza stems blob URLs', () => {
  test('no failed blob: loads after seed + play (local + stems)', async ({ page }) => {
    const blobFailures: string[] = [];
    page.on('requestfailed', (req) => {
      const u = req.url();
      if (u.startsWith('blob:')) blobFailures.push(`${u} ${req.failure()?.errorText ?? ''}`);
    });

    await page.addInitScript(() => {
      window.localStorage.setItem('STANZA_E2E_HOOKS', '1');
    });

    await page.goto('/stanza/');

    await expect
      .poll(
        async () =>
          await page.evaluate(
            () => typeof window !== 'undefined' && (window as Window & { __stanzaE2e?: unknown }).__stanzaE2e != null,
          ),
        { timeout: 20_000 },
      )
      .toBe(true);

    await page.evaluate(async () => {
      const w = window as Window & { __stanzaE2e?: { seedSongWithStems: () => Promise<string> } };
      await w.__stanzaE2e!.seedSongWithStems();
    });

    await page.locator('button.stanza-library-card').filter({ hasText: STANZA_E2E_STEM_SONG_TITLE }).click();

    const mainAudio = page.locator('audio.stanza-local-audio');
    await expect(mainAudio).toBeAttached({ timeout: 15_000 });
    await expect(mainAudio).toHaveAttribute('src', /^blob:/);

    await page.locator('button.stanza-play-btn').click();
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const audio = document.querySelector('audio.stanza-local-audio') as HTMLAudioElement | null;
            return Boolean(audio && !audio.paused && audio.currentTime > 0);
          }),
        { timeout: 8000 },
      )
      .toBe(true);

    expect(blobFailures, `blob request failures: ${blobFailures.join('; ')}`).toEqual([]);
  });
});
