import { test, expect } from '@playwright/test';
import { SMOKE_ROUTE_SPECS } from '../routeRegistry';

test.describe('All app shells smoke', () => {
  for (const { route, title, visibleSelector } of SMOKE_ROUTE_SPECS) {
    test(`boots ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveTitle(title);
      await expect(page.locator(visibleSelector)).toBeVisible();
    });
  }
});
