import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';

/**
 * The Repertoire table must draw its rows after a trip to the card view and back.
 *
 * material-react-table 3.2.1 kept the old, detached scroll container after the table unmounted, so
 * on remount the row virtualizer measured a height of 0 and drew no rows (fixed in
 * `LabsMaterialReactTable`). The bug only shows in a production build: dev StrictMode re-runs the
 * layout effect after the ref is attached and hides it. This spec is the reason the
 * e2e-prod-build CI lane exists; on the dev server it passes either way.
 */
test.describe('Encore Repertoire view toggle', () => {
  test('the table draws rows again after the grid view', async ({ page }) => {
    await enterEncoreApp(page);
    await page.waitForFunction(() => typeof window.__labsSeedEncorePerfFixture === 'function', undefined, {
      timeout: 20_000,
    });
    await page.evaluate(async () => window.__labsSeedEncorePerfFixture?.());
    await page.goto('/encore/#/library');
    await page.reload();

    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 25_000 });

    await page.getByRole('button', { name: 'Grid view' }).click();
    await expect(rows).toHaveCount(0);

    await page.getByRole('button', { name: 'Table view' }).click();
    await expect(rows.first(), 'the table must draw rows after returning from the grid view').toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);
  });
});
