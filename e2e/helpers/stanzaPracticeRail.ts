import { expect, type Page } from '@playwright/test';

/** Desktop workbench width where rail column is ~392px (`--stanza-viewer-rail-width`). */
export const STANZA_PRACTICE_RAIL_VIEWPORT = { width: 1280, height: 900 } as const;

const ROW_ALIGN_TOLERANCE_PX = 6;
const OVERLAP_TOLERANCE_PX = 1;

export async function expectStanzaPracticeRailPitchRowSingleLine(page: Page): Promise<void> {
  const rail = page.locator('.stanza-practice-rail');
  await expect(rail).toBeVisible({ timeout: 15_000 });

  const layout = await page.evaluate(
    ({ rowAlignTolerance, overlapTolerance }) => {
      const railEl = document.querySelector('.stanza-practice-rail');
      const row = document.querySelector('.stanza-rail-pitch-row');
      const originalShell = document.querySelector(
        '.stanza-rail-pitch-field--original .shared-key-shell',
      );
      const shiftShell = document.querySelector('.stanza-rail-pitch-shift-controls .shared-bpm-shell');
      const playbackChip = document.querySelector('.stanza-rail-pitch-playback-chip');
      if (!railEl || !row || !originalShell || !shiftShell) {
        return { ok: false, reason: 'missing pitch row nodes' };
      }

      const railRect = railEl.getBoundingClientRect();
      const originalRect = originalShell.getBoundingClientRect();
      const shiftRect = shiftShell.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();

      const playbackRect = playbackChip?.getBoundingClientRect();
      const shiftControls = document.querySelector('.stanza-rail-pitch-shift-controls');
      const shiftControlsRect = shiftControls?.getBoundingClientRect();

      const sameRow =
        Math.abs(originalRect.bottom - shiftRect.bottom) <= rowAlignTolerance &&
        Math.abs(originalRect.top - shiftRect.top) <= rowAlignTolerance;

      const noOverlap = originalRect.right <= shiftRect.left + overlapTolerance;

      const playbackOnShiftRow =
        !playbackRect ||
        !shiftControlsRect ||
        (Math.abs(playbackRect.top - shiftControlsRect.top) <= rowAlignTolerance &&
          playbackRect.top < rowRect.bottom + rowAlignTolerance);

      const railWidthOk = railRect.width >= 360 && railRect.width <= 420;

      return {
        ok: sameRow && noOverlap && playbackOnShiftRow && railWidthOk,
        sameRow,
        noOverlap,
        playbackOnShiftRow,
        railWidthOk,
        railWidth: railRect.width,
        original: { top: originalRect.top, bottom: originalRect.bottom, right: originalRect.right },
        shift: { top: shiftRect.top, left: shiftRect.left, bottom: shiftRect.bottom },
        playback: playbackRect
          ? { top: playbackRect.top, bottom: playbackRect.bottom }
          : null,
      };
    },
    {
      rowAlignTolerance: ROW_ALIGN_TOLERANCE_PX,
      overlapTolerance: OVERLAP_TOLERANCE_PX,
    },
  );

  expect(layout.ok, JSON.stringify(layout)).toBe(true);
}
