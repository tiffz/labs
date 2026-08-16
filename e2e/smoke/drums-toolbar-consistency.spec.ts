import { test, expect } from '@playwright/test';

/**
 * Visual consistency guards for the drums playback toolbar.
 *
 * Both bugs these cover shipped silently and were only ever found by the owner looking at the app:
 *
 * 1. The BPM field rendered 4px taller than every other control in the row, and the time signature
 *    trigger a font step smaller than the BPM field beside it. The height was declared in four
 *    places across two files and two cascade layers, and `.shared-bpm-shell` re-declares
 *    `--bpm-shell-height` on itself, so overrides set on ancestors silently did nothing.
 * 2. The beat-grouping help tooltip was authored white with a purple border in July 2026 and has
 *    rendered as MUI's near-black default ever since, because the rule sat inside
 *    `@layer components` while MUI's emotion styles are unlayered. Unlayered always wins.
 *
 * Nothing in the suite looked at rendered geometry or colour, so both passed every gate. These
 * tests read computed style from a real browser, which is the only place either bug exists.
 */

/** Controls that sit in one row and must read as one set. */
const TOOLBAR_CONTROL_SELECTORS = [
  '.play-button',
  '.shared-time-sig-trigger',
  '.shared-bpm-shell',
  '.settings-button',
];

test.describe('drums playback toolbar consistency', () => {
  test('every control in the bar shares one height', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/drums/');
    await expect(page.locator('.playback-controls-bar')).toBeVisible({ timeout: 15_000 });

    const measured = await page.evaluate((selectors) => {
      return selectors.map((sel) => {
        const el = document.querySelector(sel);
        if (!el) return { sel, missing: true as const };
        const rect = el.getBoundingClientRect();
        return {
          sel,
          height: Math.round(rect.height),
          radius: getComputedStyle(el).borderTopLeftRadius,
          missing: false as const,
        };
      });
    }, TOOLBAR_CONTROL_SELECTORS);

    const present = measured.filter((m) => !m.missing) as {
      sel: string;
      height: number;
      radius: string;
      missing: false;
    }[];
    // If the toolbar is restructured and these selectors stop matching, fail rather than pass
    // vacuously on an empty set.
    expect(present.length, `toolbar controls not found: ${JSON.stringify(measured)}`).toBe(
      TOOLBAR_CONTROL_SELECTORS.length
    );

    const heights = [...new Set(present.map((m) => m.height))];
    expect(heights.length, `controls disagree on height: ${JSON.stringify(present)}`).toBe(1);

    // Corner radius drifted the same way: the timing fields sat at 6px while every button in the
    // app used 8px, which reads as sloppiness rather than intent.
    const radii = [...new Set(present.map((m) => m.radius))];
    expect(radii.length, `controls disagree on corner radius: ${JSON.stringify(present)}`).toBe(1);
  });

  test('the timing inputs share one font size', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/drums/');
    await expect(page.locator('.playback-controls-bar')).toBeVisible({ timeout: 15_000 });

    const sizes = await page.evaluate(() => {
      const read = (sel: string) => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el).fontSize : null;
      };
      return {
        timeSignature: read('.shared-time-sig-trigger'),
        bpm: read('.shared-bpm-shell'),
      };
    });

    expect(sizes.timeSignature).not.toBeNull();
    expect(sizes.bpm).not.toBeNull();
    expect(
      sizes.timeSignature,
      `time signature and BPM disagree on font size: ${JSON.stringify(sizes)}`
    ).toBe(sizes.bpm);
  });

  test('the help tooltip uses the app surface, not the MUI default', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/drums/');
    await expect(page.locator('.playback-controls-bar')).toBeVisible({ timeout: 15_000 });

    /*
     * Build MUI's tooltip DOM shape rather than hovering to open it. The assertion is about which
     * stylesheet wins the cascade, not about MUI's open/close behaviour, and a constructed node
     * measures that directly. The control case (no wrapper class) proves the check can fail.
     */
    const result = await page.evaluate(() => {
      const measure = (popperClass: string) => {
        const popper = document.createElement('div');
        popper.className = popperClass;
        const tip = document.createElement('div');
        tip.className = 'MuiTooltip-tooltip';
        popper.appendChild(tip);
        document.body.appendChild(popper);
        const bg = getComputedStyle(tip).backgroundColor;
        document.body.removeChild(popper);
        return bg;
      };
      return {
        themed: measure('drums-help-tooltip MuiTooltip-popper'),
        muiDefault: measure('MuiTooltip-popper'),
      };
    });

    // The control must be MUI's dark default, or this test is measuring nothing.
    expect(
      result.muiDefault,
      `expected MUI's dark default on an unthemed tooltip, got ${result.muiDefault}`
    ).not.toBe(result.themed);

    const rgb = result.themed.match(/\d+/g)?.map(Number) ?? [];
    expect(rgb.length, `unparseable colour: ${result.themed}`).toBeGreaterThanOrEqual(3);
    const [r, g, b] = rgb;
    // A light surface, matching the rest of the drums chrome.
    expect(
      Math.min(r, g, b),
      `help tooltip is not on a light surface (${result.themed}); the drums override has probably ` +
        `fallen back inside a cascade layer again, where MUI's unlayered styles beat it`
    ).toBeGreaterThan(200);
  });
});
