import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';
import {
  addReferenceLinkViaPaste,
  dragPracticeResourceChipToPlay,
  ENCORE_PRACTICE_RESOURCE_SECTION,
} from '../helpers/encorePracticeResourceDnD';

/** Stable 11-char YouTube id — caption becomes `Video · e2ePractD01`. */
const E2E_YOUTUBE_VIDEO_ID = 'e2ePractD01';
const E2E_YOUTUBE_URL = `https://www.youtube.com/watch?v=${E2E_YOUTUBE_VIDEO_ID}`;
const E2E_CHIP_CAPTION = `Video · ${E2E_YOUTUBE_VIDEO_ID}`;

/**
 * CUJ: Song page practice resources — drag a Listen chip into Play (cross-section move).
 * Catches dnd-kit DOM regressions (mid-drag link swap, pointerup interception).
 * @see src/encore/CUJs.md · practiceResourceDragContext.test.ts
 */
test.describe('Encore practice resource DnD', () => {
  test('drag Listen chip to Play section', async ({ page }) => {
    await enterEncoreApp(page);
    await page.goto('/encore/#/library');
    await expect(page.getByRole('heading', { name: 'Your repertoire' })).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Add song' }).first().click();
    const addSongDialog = page.getByRole('dialog', { name: 'Add song' });
    await addSongDialog.getByLabel('Title').fill('E2E DnD Song');
    await addSongDialog.getByLabel('Artist').fill('Labs Agent');
    await addSongDialog.getByRole('button', { name: 'Add song' }).click();
    await expect(page).toHaveURL(/#\/song\//, { timeout: 15_000 });

    await expect(page.getByRole('heading', { name: 'Practice resources', level: 2 })).toBeVisible({
      timeout: 10_000,
    });

    const listenSection = page.locator(ENCORE_PRACTICE_RESOURCE_SECTION.listen);
    const playSection = page.locator(ENCORE_PRACTICE_RESOURCE_SECTION.play);
    await expect(listenSection).toBeVisible();
    await expect(playSection).toBeVisible();

    await addReferenceLinkViaPaste(page, listenSection, E2E_YOUTUBE_URL);

    const chip = listenSection.locator('.encore-practice-resource-chip-draggable').filter({
      hasText: E2E_CHIP_CAPTION,
    });
    await expect(chip).toBeVisible({ timeout: 10_000 });
    await expect(playSection.getByText(E2E_CHIP_CAPTION)).toHaveCount(0);

    await dragPracticeResourceChipToPlay(page, chip);

    await expect(playSection.getByText(E2E_CHIP_CAPTION)).toBeVisible({ timeout: 10_000 });
    await expect(listenSection.getByText(E2E_CHIP_CAPTION)).toHaveCount(0);
  });
});
