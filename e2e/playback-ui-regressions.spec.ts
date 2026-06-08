import { test, expect, type Page } from '@playwright/test';

const ENCORE_CHORD_PLAYBACK_SETTINGS_KEY = 'encore-originals-chord-playback-settings';

async function enterEncoreApp(page: Page): Promise<void> {
  await page.goto('/encore/');
  await page.waitForSelector('#root', { state: 'attached' });
  const continueLocal = page.getByRole('button', { name: 'Continue without Google' });
  if (await continueLocal.isVisible().catch(() => false)) {
    await continueLocal.click();
  }
}

async function seedEncoreOriginalWithChords(page: Page): Promise<void> {
  await enterEncoreApp(page);
  await page.evaluate(
    (storageKey) => {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          chordStyleId: 'simple',
          soundType: 'piano',
          chordVolume: 72,
          chordMuted: false,
          drumsEnabled: true,
          drumsVolume: 80,
          drumsMuted: false,
          drumPattern: 'D---D---D---D---',
        }),
      );
    },
    ENCORE_CHORD_PLAYBACK_SETTINGS_KEY,
  );
  await page.goto('/encore/#/originals');
  await expect(page.getByRole('heading', { name: 'Originals' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'New Original' }).click();
  await expect(page.getByRole('textbox', { name: 'Song title', exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole('button', { name: 'Write lyrics' }).click();
  const lyricsChart = page.getByLabel('Lyrics chart');
  await expect(lyricsChart).toBeVisible({ timeout: 10_000 });
  await lyricsChart.fill('[Verse 1]\n[Bb]around here\n');
  await page.getByRole('button', { name: 'Add chords' }).click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible({
    timeout: 10_000,
  });
}

test.describe('Playback UI regressions', () => {
  test('Words chord sound menu uses words appearance on portaled paper', async ({ page }) => {
    await page.goto('/words/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Words in Rhythm');

    await page.getByRole('button', { name: 'Sound settings' }).click();
    await page.getByRole('button', { name: 'Chord sound' }).click();

    const menuPaper = page.locator('.shared-playback-field-select__menu--words');
    await expect(menuPaper).toBeVisible({ timeout: 5_000 });
    await expect(menuPaper).toHaveClass(/shared-playback-field-select__menu--words/);
  });

  test('Encore originals drum mini notation highlight advances during playback', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await seedEncoreOriginalWithChords(page);

    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.getByRole('button', { name: 'Playback settings' }).click();
    const notation = page.locator('.shared-chord-playback-settings__drums-notation');
    await expect(notation).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByPlaceholder('D-T-K-T- or paste Darbuka Trainer URL'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Customize in Darbuka trainer' })).toBeVisible();

    const readHighlightLeft = async (): Promise<number | null> =>
      notation.locator('[data-highlighted="true"]').first().evaluate((el) => {
        const box = el.getBoundingClientRect();
        return box.width > 0 ? box.left : null;
      });

    await expect
      .poll(readHighlightLeft, { timeout: 10_000, message: 'highlight should appear' })
      .not.toBeNull();

    const firstLeft = await readHighlightLeft();
    await expect
      .poll(readHighlightLeft, {
        timeout: 8_000,
        message: 'highlight should move during playback',
      })
      .not.toBe(firstLeft);
  });

  test('Stanza drums enabled: pattern input visible and notation highlight moves during playback', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.addInitScript(() => {
      window.localStorage.setItem('STANZA_E2E_HOOKS', '1');
    });
    await page.goto('/stanza/');
    await expect
      .poll(
        async () =>
          page.evaluate(
            () =>
              typeof window !== 'undefined' &&
              (window as Window & { __stanzaE2e?: unknown }).__stanzaE2e != null,
          ),
        { timeout: 20_000 },
      )
      .toBe(true);

    await page.evaluate(async () => {
      const w = window as Window & { __stanzaE2e?: { seedSongWithDrumsPlayback: () => Promise<string> } };
      await w.__stanzaE2e!.seedSongWithDrumsPlayback();
    });

    await page.locator('button.stanza-library-card').filter({ hasText: 'E2E Drums Song' }).click();
    await expect(page.getByPlaceholder('D-T-K-T- or paste Darbuka Trainer URL')).toBeVisible({
      timeout: 15_000,
    });

    await page.locator('button.stanza-play-btn').click();
    const notation = page.locator('.stanza-drums-notation-frame');
    await expect(notation).toBeVisible({ timeout: 10_000 });

    const readHighlightLeft = async (): Promise<number | null> =>
      notation.locator('[data-highlighted="true"]').first().evaluate((el) => {
        const box = el.getBoundingClientRect();
        return box.width > 0 ? box.left : null;
      });

    await expect
      .poll(readHighlightLeft, { timeout: 12_000, message: 'drum highlight should appear' })
      .not.toBeNull();

    const firstLeft = await readHighlightLeft();
    await expect
      .poll(readHighlightLeft, {
        timeout: 10_000,
        message: 'drum highlight should move during playback',
      })
      .not.toBe(firstLeft);
  });

  test('Words section settings: host rhythm input + DrumAccompaniment preset row', async ({ page }) => {
    await page.goto('/words/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Words in Rhythm');

    await page.getByRole('button', { name: / settings$/ }).first().click();
    await expect(page.getByPlaceholder('D---T---D-D-T---')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: /Choose rhythm preset/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Customize in Darbuka trainer' })).toBeVisible();
  });

  test('existing original loads with spinner, not Song not found flash', async ({ page }) => {
    await enterEncoreApp(page);
    await page.goto('/encore/#/originals');
    await expect(page.getByRole('heading', { name: 'Originals' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'New Original' }).click();
    const titleField = page.getByPlaceholder('Untitled original');
    await expect(titleField).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(() => page.url(), { timeout: 15_000 })
      .toMatch(/#\/originals\/(?!new)[^/?#]+$/);
    const songUrl = page.url();

    await page.reload();
    await expect(page).toHaveURL(songUrl);

    await expect(page.getByText('Song not found')).not.toBeVisible({ timeout: 1_000 });
    await expect(
      page.getByLabel('Loading original song').or(titleField),
    ).toBeVisible({ timeout: 5_000 });
    await expect(titleField).toBeVisible({ timeout: 15_000 });
  });
});
