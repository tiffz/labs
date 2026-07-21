import { test, expect, type Page } from '@playwright/test';
import { enterEncoreApp } from './helpers/enterEncoreApp';
import { clickStanzaLibraryCard } from './helpers/stanzaLibrary';

const ENCORE_CHORD_PLAYBACK_SETTINGS_KEY = 'encore-originals-chord-playback-settings';

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
  // Write mode preserves plain lyrics only — inline `[Bb]` tokens are not chord markers until paint.
  await lyricsChart.fill('[Verse 1]\naround here\n');
  await page.getByRole('button', { name: 'Add chords' }).click();
  await expect(page.getByRole('toolbar', { name: 'Chord palette' })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole('group', { name: 'Triads' }).getByRole('button', { name: 'C', exact: true }).click();
  await page.getByRole('button', { name: 'around', exact: true }).click();
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
    test.setTimeout(90_000);
    await seedEncoreOriginalWithChords(page);

    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.getByRole('button', { name: 'Playback settings' }).click();
    const notation = page.locator('.shared-chord-playback-settings__drums-notation');
    await expect(notation).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: /Edit drum pattern/i }).click();
    const drumEditor = page.getByRole('dialog', { name: /Drum pattern editor/i });
    await expect(drumEditor.getByPlaceholder('D-T-K-T- or paste Darbuka Trainer URL')).toBeVisible();
    await expect(drumEditor.getByRole('link', { name: 'Customize in Darbuka trainer' })).toBeVisible();
    await drumEditor.getByRole('button', { name: /^Done$/i }).click();

    const readHighlightLeft = async (): Promise<number | null> =>
      notation.locator('[data-highlighted="true"]').first().evaluate((el) => {
        const box = el.getBoundingClientRect();
        return box.width > 0 ? box.left : null;
      });

    // Wider poll windows: the highlight is driven by real-time audio playback,
    // which starts and advances slowly under CI's CPU contention (a recurring
    // pre-push flake). More time is the honest accommodation for a real-time
    // clock — it cannot be sped up — and stays inside the 60s test budget.
    await expect
      .poll(readHighlightLeft, { timeout: 20_000, message: 'highlight should appear' })
      .not.toBeNull();

    const firstLeft = await readHighlightLeft();
    await expect
      .poll(readHighlightLeft, {
        timeout: 20_000,
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

    await clickStanzaLibraryCard(page, 'E2E Drums Song');
    await page.getByRole('button', { name: /Edit drum pattern/i }).click();
    const drumEditor = page.getByRole('dialog', { name: /Drum pattern editor/i });
    await expect(drumEditor.getByPlaceholder('D-T-K-T- or paste Darbuka Trainer URL')).toBeVisible({
      timeout: 15_000,
    });
    await drumEditor.getByRole('button', { name: /^Done$/i }).click();
    await expect(page.getByRole('button', { name: /Edit drum pattern/i })).toBeVisible();

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

    await page.getByRole('button', { name: 'Verse settings' }).click();
    await expect(page.getByPlaceholder('D---T---D-D-T---')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('link', { name: 'Customize in Darbuka trainer' })).toBeVisible();
    await page.getByRole('button', { name: /Edit drum pattern/i }).click();
    const drumEditor = page.getByRole('dialog', { name: /Drum pattern editor/i });
    await expect(drumEditor.getByRole('button', { name: /Use Maqsum drum preset/i })).toBeVisible();
  });

  test('existing original loads with spinner, not Song not found flash', async ({ page }) => {
    await enterEncoreApp(page);
    await page.goto('/encore/#/originals');
    await expect(page.getByRole('heading', { name: 'Originals' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'New Original' }).click();
    const titleField = page.getByPlaceholder('Untitled original');
    await expect(titleField).toBeVisible({ timeout: 10_000 });
    await titleField.fill('E2E reload smoke');
    await expect(titleField).toHaveValue('E2E reload smoke');
    await expect
      .poll(() => page.url(), { timeout: 15_000 })
      .toMatch(/#\/originals\/(?!new)[^/?#]+$/);
    const songUrl = page.url();
    const songId = songUrl.match(/#\/originals\/([^/?#]+)$/)?.[1];
    expect(songId).toBeTruthy();
    await expect
      .poll(
        () =>
          page.evaluate(async (id) => {
            if (!id) return false;
            return new Promise<boolean>((resolve) => {
              const req = indexedDB.open('encore-repertoire');
              req.onerror = () => resolve(false);
              req.onsuccess = () => {
                const db = req.result;
                const tx = db.transaction('originals', 'readonly');
                const get = tx.objectStore('originals').get(id);
                get.onerror = () => resolve(false);
                get.onsuccess = () => resolve(!!get.result);
              };
            });
          }, songId),
        { timeout: 15_000, message: 'original should persist to IndexedDB before reload' },
      )
      .toBe(true);

    await page.reload();
    await expect(page).toHaveURL(songUrl);

    await expect(page.getByText('Song not found')).not.toBeVisible({ timeout: 3_000 });
    await expect(
      page.getByLabel('Loading original song').or(titleField),
    ).toBeVisible({ timeout: 5_000 });
    await expect(titleField).toBeVisible({ timeout: 15_000 });
  });
});
