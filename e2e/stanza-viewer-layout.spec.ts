import { test, expect } from '@playwright/test';
import { STANZA_E2E_STEM_SONG_TITLE } from '../src/stanza/e2e/stanzaE2eBootstrap';

/** Max horizontal drift (px) between workbench-aligned surfaces. */
const EDGE_TOLERANCE_PX = 2;

test.describe('Stanza viewer layout alignment', () => {
  test('library and playback stack share workbench horizontal edges', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('STANZA_E2E_HOOKS', '1');
    });

    await page.setViewportSize({ width: 1280, height: 900 });
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

    await expect(page.locator('.stanza-library-panel')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.stanza-playback-stack')).toBeVisible();

    const edges = await page.evaluate((tolerance) => {
      const workbench = document.querySelector('.stanza-viewer-workbench');
      const mainColumn = document.querySelector('.stanza-viewer-main-column');
      const library = document.querySelector('.stanza-library-panel');
      const playback = document.querySelector('.stanza-playback-stack');
      if (!workbench || !mainColumn || !library || !playback) return { ok: false, reason: 'missing nodes' };
      const wb = workbench.getBoundingClientRect();
      const mc = mainColumn.getBoundingClientRect();
      const lib = library.getBoundingClientRect();
      const pb = playback.getBoundingClientRect();
      const drift = {
        libLeft: Math.abs(lib.left - wb.left),
        libRight: Math.abs(lib.right - wb.right),
        pbLeft: Math.abs(pb.left - mc.left),
        pbRight: Math.abs(pb.right - mc.right),
      };
      const ok =
        drift.libLeft <= tolerance &&
        drift.libRight <= tolerance &&
        drift.pbLeft <= tolerance &&
        drift.pbRight <= tolerance;
      return { ok, drift, wb: { left: wb.left, right: wb.right, width: wb.width } };
    }, EDGE_TOLERANCE_PX);

    expect(edges.ok, JSON.stringify(edges)).toBe(true);

    const stackAboveLibrary = await page.evaluate(() => {
      const playback = document.querySelector('.stanza-playback-stack');
      const library = document.querySelector('.stanza-library-panel');
      if (!playback || !library) return { ok: false, reason: 'missing nodes' };
      const playbackRect = playback.getBoundingClientRect();
      const libraryRect = library.getBoundingClientRect();
      return {
        ok: playbackRect.bottom <= libraryRect.top + 4,
        playbackBottom: playbackRect.bottom,
        libraryTop: libraryRect.top,
      };
    });

    expect(stackAboveLibrary.ok, JSON.stringify(stackAboveLibrary)).toBe(true);
  });
});
