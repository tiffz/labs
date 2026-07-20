import type { Page } from '@playwright/test';

/**
 * Measures how much icon-bearing chrome resizes when the Material icon font
 * finishes loading.
 *
 * Before the font arrives, an icon element still contains its ligature name as
 * literal text ("arrow_drop_down"), which a fallback family renders far wider
 * than the single glyph it becomes. Any control sized by that content is born
 * too wide and snaps narrower on load — a layout shift the user sees.
 *
 * `src/shared/ui/icons/materialIcons.css` prevents this by reserving the final
 * `1em` box during `icons-pending`. This helper is how we keep it honest.
 */

export interface IconShiftSample {
  icon: string;
  pendingWidth: number;
  readyWidth: number;
  delta: number;
}

export interface IconShiftReport {
  worst: IconShiftSample | null;
  samples: IconShiftSample[];
  /** True when the pending class was observed — otherwise the run proves nothing. */
  observedPending: boolean;
}

interface Geometry {
  icon: string;
  buttonWidth: number | null;
}

const FONT_DELAY_MS = 2000;

/**
 * Only the icon families. Delaying every font would let text reflow (Roboto et
 * al.) land in the same measurement window and be misread as icon shift — a
 * separate problem with a separate fix.
 */
const ICON_FONT_URL_PATTERN = /material-symbols|material-icons/i;

/** Comfortably inside the icon delay above, so the first snapshot is pending. */
const TEXT_FONT_SETTLE_MS = 900;

async function captureGeometry(page: Page): Promise<Geometry[]> {
  return page.evaluate(() => {
    const out: Geometry[] = [];
    for (const el of document.querySelectorAll('.material-symbols-outlined, .material-icons')) {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      const button = el.closest('button');
      out.push({
        icon: (el.textContent ?? '').trim().slice(0, 24),
        buttonWidth: button ? button.getBoundingClientRect().width : null,
      });
    }
    return out;
  });
}

/**
 * Loads `route` with the icon font artificially delayed, then compares chrome
 * geometry across the font swap. Call before any other navigation on `page`.
 */
export async function measureIconFontLayoutShift(
  page: Page,
  route: string
): Promise<IconShiftReport> {
  await page.route('**/*.woff2', async (routeHandle) => {
    if (ICON_FONT_URL_PATTERN.test(routeHandle.request().url())) {
      await new Promise((resolve) => setTimeout(resolve, FONT_DELAY_MS));
    }
    await routeHandle.continue();
  });

  await page.goto(route, { waitUntil: 'domcontentloaded' });

  // Settle before the first snapshot so the app has mounted its icons. Only the
  // icon families are throttled, so the text fonts have already landed by now
  // and their reflow cannot be misattributed to the icon swap.
  //
  // Deliberately a plain wait: `waitForFunction(() => document.fonts.check(…))`
  // hangs on Chords regardless of polling mode, overrunning its own timeout by
  // ~30x. Nothing here needs to be that clever.
  await page.waitForTimeout(TEXT_FONT_SETTLE_MS);

  const observedPending = await page.evaluate(() =>
    document.documentElement.classList.contains('icons-pending')
  );
  const pending = await captureGeometry(page);

  await page
    .waitForFunction(() => document.documentElement.classList.contains('icons-ready'), {
      timeout: 15_000,
      polling: 300,
    })
    .catch(() => {
      // Fall through — an app with no icons never flips the class.
    });
  await page.waitForTimeout(250);
  const ready = await captureGeometry(page);

  const samples: IconShiftSample[] = [];
  // Node order is stable across the swap: only glyph metrics change, not the tree.
  for (let i = 0; i < Math.min(pending.length, ready.length); i += 1) {
    const before = pending[i];
    const after = ready[i];
    if (before.buttonWidth === null || after.buttonWidth === null) continue;
    if (before.icon !== after.icon) continue;
    samples.push({
      icon: before.icon,
      pendingWidth: before.buttonWidth,
      readyWidth: after.buttonWidth,
      delta: Math.abs(after.buttonWidth - before.buttonWidth),
    });
  }

  const worst = samples.reduce<IconShiftSample | null>(
    (acc, sample) => (acc === null || sample.delta > acc.delta ? sample : acc),
    null
  );

  return { worst, samples, observedPending };
}

export function formatIconShiftFailure(route: string, report: IconShiftReport): string {
  const { worst } = report;
  if (!worst) return `${route}: no icon-bearing buttons sampled`;
  return (
    `${route}: "${worst.icon}" button resized ${worst.pendingWidth.toFixed(1)}px -> ` +
    `${worst.readyWidth.toFixed(1)}px (${worst.delta.toFixed(1)}px) when the icon font loaded. ` +
    `Reserve the glyph box during 'icons-pending' — see src/shared/ui/icons/materialIcons.css.`
  );
}
