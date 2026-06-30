import { test, expect } from '@playwright/test';
import { SMOKE_ROUTE_SPECS } from '../routeRegistry';

test.describe('All app shells smoke', () => {
  for (const { route, title, visibleSelector, smokeVisibleTimeoutMs } of SMOKE_ROUTE_SPECS) {
    test(`boots ${route}`, async ({ page }) => {
      if (smokeVisibleTimeoutMs) {
        test.setTimeout(smokeVisibleTimeoutMs + 20_000);
      }
      const pageErrors: string[] = [];
      page.on('pageerror', (err) => {
        pageErrors.push(err.message);
      });

      await page.goto(route);
      await expect(page).toHaveTitle(title);
      await expect(page.locator(visibleSelector)).toBeVisible(
        smokeVisibleTimeoutMs ? { timeout: smokeVisibleTimeoutMs } : undefined,
      );

      expect(pageErrors, `uncaught page errors on ${route}`).toEqual([]);
    });
  }
});
