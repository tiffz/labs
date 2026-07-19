/**
 * Registry-driven responsive floor for every app shell at the 390px phone
 * checkpoint (docs/RESPONSIVE_DESIGN.md): no page-level horizontal scroll and
 * no sub-24px touch targets. Per-app layout-heuristics specs add app-specific
 * assertions on top; this spec is the floor that new routes inherit for free.
 */
import { test, expect } from '@playwright/test';
import { SMOKE_ROUTE_SPECS, VISUAL_VIEWPORTS } from '../routeRegistry';
import { runHorizontalScrollHeuristicInBrowser } from '../helpers/horizontalScrollHeuristic';
import { runTouchTargetHeuristicInBrowser } from '../helpers/touchTargetHeuristic';

type RouteOverride = {
  /** Regions allowed to scroll horizontally (carousels, notation, tab strips). */
  allowHorizontalScrollSelectors?: string[];
  /** Regions exempt from the 24px touch-target floor (documented reason required). */
  allowSmallTargetSelectors?: string[];
  /** Skip entirely, with the reason shown in the report. */
  skip?: string;
};

/**
 * Keep this list short — every entry is debt. Prefer fixing the layout or
 * tagging the element with `data-labs-allow-horizontal-scroll` /
 * `data-labs-allow-small-touch-target` at the source with a comment.
 */
const ROUTE_OVERRIDES: Record<string, RouteOverride> = {};

// Coarse pointer so `@media (pointer: coarse)` ergonomics rules apply, like a real phone.
test.use({ hasTouch: true });

test.describe('Responsive floor: 390px, all app routes', () => {
  for (const { route, visibleSelector, smokeVisibleTimeoutMs } of SMOKE_ROUTE_SPECS) {
    const override = ROUTE_OVERRIDES[route] ?? {};
    test(`mobile floor ${route}`, async ({ page }) => {
      test.skip(Boolean(override.skip), override.skip);
      if (smokeVisibleTimeoutMs) {
        test.setTimeout(smokeVisibleTimeoutMs + 30_000);
      }
      await page.setViewportSize(VISUAL_VIEWPORTS.mobile);
      await page.goto(route);
      await expect(page.locator(visibleSelector)).toBeVisible(
        smokeVisibleTimeoutMs ? { timeout: smokeVisibleTimeoutMs } : undefined,
      );
      // Let post-boot layout (fonts, async panels) settle one frame.
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));

      const scroll = await page.evaluate(runHorizontalScrollHeuristicInBrowser, {
        rootSelector: 'body',
        allowHorizontalScrollSelectors: override.allowHorizontalScrollSelectors ?? [],
      });
      expect(scroll.ok, scroll.ok ? '' : `horizontal scroll on ${route}: ${JSON.stringify(scroll)}`).toBe(
        true,
      );

      const touch = await page.evaluate(runTouchTargetHeuristicInBrowser, {
        rootSelector: 'body',
        allowSmallTargetSelectors: override.allowSmallTargetSelectors ?? [],
      });
      expect(touch.ok, touch.ok ? '' : `touch targets on ${route}: ${JSON.stringify(touch)}`).toBe(
        true,
      );
    });
  }
});
