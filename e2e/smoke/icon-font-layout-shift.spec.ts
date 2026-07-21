import { test, expect } from '@playwright/test';
import {
  measureIconFontLayoutShift,
  formatIconShiftFailure,
} from '../helpers/iconFontLayoutShift';

/**
 * Guards the icon-font swap against layout shift.
 *
 * The pending-state box reservation in `src/shared/ui/icons/materialIcons.css`
 * is easy to defeat by accident: any rule that sets `width: auto` on an icon at
 * higher specificity hands layout back to the fallback ligature text. That
 * regressed Darbuka's Play button by 89px and its metronome button by 25px
 * before the reservation landed, so the failure mode is neither theoretical nor
 * subtle — but it is invisible on a warm cache, which is why it needs a test.
 *
 * Routes here are the icon-dense ones. Sub-pixel drift from glyph metrics is
 * expected; anything a user would notice is not.
 */

const MAX_SHIFT_PX = 2;

const ROUTES = ['/drums/', '/words/', '/chords/', '/scales/', '/sight/', '/ui/'];

test.describe('Icon font load causes no layout shift', () => {
  // This spec holds the icon font back on purpose and then waits out the swap,
  // so it needs more room than the default budget allows.
  test.slow();

  for (const route of ROUTES) {
    test(`${route} chrome keeps its size across the icon font swap`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });

      const report = await measureIconFontLayoutShift(page, route);

      // A run that never saw `icons-pending` measured nothing and would pass
      // vacuously — fail loudly instead of banking a false green.
      expect(report.observedPending, `${route}: never entered 'icons-pending'`).toBe(true);
      expect(report.samples.length, `${route}: no icon buttons sampled`).toBeGreaterThan(0);

      const worstDelta = report.worst?.delta ?? 0;
      expect(worstDelta, formatIconShiftFailure(route, report)).toBeLessThanOrEqual(MAX_SHIFT_PX);
    });
  }
});
