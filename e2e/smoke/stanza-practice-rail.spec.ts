import { expect, test } from '@playwright/test';

import { clickStanzaLibraryCard } from '../helpers/stanzaLibrary';
import {
  expectStanzaPracticeRailPitchRowSingleLine,
  STANZA_PRACTICE_RAIL_VIEWPORT,
} from '../helpers/stanzaPracticeRail';
import { STANZA_E2E_PRACTICE_RAIL_SONG_TITLE } from '../../src/stanza/e2e/stanzaE2eBootstrap';

test.describe('Stanza practice rail layout', () => {
  test('pitch row stays on one line at rail width without overlap', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('STANZA_E2E_HOOKS', '1');
    });

    await page.setViewportSize(STANZA_PRACTICE_RAIL_VIEWPORT);
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
      const w = window as Window & {
        __stanzaE2e?: { seedSongWithPracticeRail: () => Promise<string> };
      };
      await w.__stanzaE2e!.seedSongWithPracticeRail();
    });

    await clickStanzaLibraryCard(page, STANZA_E2E_PRACTICE_RAIL_SONG_TITLE);

    await expect(page.locator('.stanza-practice-rail')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.stanza-rail-section--pitch')).toBeVisible();
    await expect(page.locator('.stanza-rail-pitch-playback-chip')).toBeVisible();

    await expectStanzaPracticeRailPitchRowSingleLine(page);
  });
});
