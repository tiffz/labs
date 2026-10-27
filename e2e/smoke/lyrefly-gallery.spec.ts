import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

const IMPORT_FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'lyrefly', 'import', '__fixtures__');
// 1x1 transparent PNG: page art for the import, never shown at size.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

test.describe('Lyrefly gallery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lyrefly/?e2eSeed=1');
    await expect(page).toHaveTitle(/Lyrefly/i);
    await expect(page.getByTestId('lyrefly-app')).toBeVisible();
    await expect(page.getByTestId('lyrefly-showcase')).toBeVisible({ timeout: 15000 });
  });

  test('opens script stage from seeded project', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Midnight Courier/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Open Midnight Courier/i }).click();
    await expect(page).toHaveURL(/#\/project\//, { timeout: 15000 });
    await expect(page.getByTestId('lyrefly-project-workbench')).toBeVisible();
    await expect(page.getByTestId('lyrefly-script-editor')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('lyrefly-script-preview')).toBeVisible();
    await expect(page.getByTestId('lyrefly-workflow-stepper')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Script (current step)' })).toBeVisible();
  });

  test('creates a new comic with brainstorm workflow', async ({ page }) => {
    await page.getByRole('button', { name: /New comic/i }).click();
    await expect(page).toHaveURL(/#\/project\//, { timeout: 15000 });
    await expect(page.getByTestId('lyrefly-project-workbench')).toBeVisible();
    await expect(page.getByTestId('lyrefly-brainstorm-stage')).toBeVisible();
    await expect(page.getByTestId('lyrefly-brainstorm-board')).toBeVisible();
    await expect(page.getByTestId('lyrefly-concept-shelf')).toBeVisible();
    await expect(page.getByTestId('lyrefly-brainstorm-resources')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Concept art' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Add concept art/i })).toBeVisible();
    await expect(page.getByTestId('lyrefly-workflow-stepper')).toBeVisible();
    await expect(page.getByTestId('lyrefly-continue-next-stage')).toBeVisible();
  });

  // The stage actions change text per stage ("Continue to Publish", "Back to gallery"); they used
  // to resize their grid column and slide the stepper up to 33px sideways on every click.
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    test(`workbench header holds still across stages at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.getByRole('button', { name: /Open Midnight Courier/i }).click();
      const stepper = page.getByTestId('lyrefly-workflow-stepper');
      const actions = page.getByTestId('lyrefly-stage-actions');
      await expect(stepper).toBeVisible({ timeout: 15000 });

      const geometry = async () => {
        const s = await stepper.boundingBox();
        const a = await actions.boundingBox();
        return [s?.x, s?.y, s?.width, a?.x, a?.width].map((n) => Math.round(n ?? NaN));
      };

      const stages = ['Brainstorm', 'Script', 'Thumbs', 'Draw', 'Publish'];
      await stepper.getByRole('button', { name: stages[0] }).click();
      await expect(stepper.getByRole('button', { name: `${stages[0]} (current step)` })).toBeVisible();
      const baseline = await geometry();
      for (const stage of stages.slice(1)) {
        await stepper.getByRole('button', { name: stage }).click();
        await expect(stepper.getByRole('button', { name: `${stage} (current step)` })).toBeVisible();
        expect(await geometry(), `header geometry on ${stage}`).toEqual(baseline);
      }
    });
  }

  test('imports a comics website from the Accounts tab', async ({ page }) => {
    // The live site is never contacted: its index, home page and images come from fixtures.
    await page.route('https://slantofrain.com/**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/page-data/index/page-data.json') {
        return route.fulfill({ contentType: 'application/json', body: readFileSync(join(IMPORT_FIXTURES, 'slantofrain-index.page-data.json')) });
      }
      if (url.pathname === '/') {
        return route.fulfill({ contentType: 'text/html', body: readFileSync(join(IMPORT_FIXTURES, 'slantofrain-home.html')) });
      }
      return route.fulfill({ contentType: 'image/png', body: PNG });
    });

    await page.getByTestId('lyrefly-accounts-tab').click();
    await expect(page.getByTestId('lyrefly-accounts')).toBeVisible();
    await page.getByRole('button', { name: 'Import from a website' }).click();
    await page.getByRole('button', { name: 'slantofrain.com' }).click();
    await expect(page.getByTestId('lyrefly-import-summary')).toContainText('2 comics');
    await expect(page.getByLabel('Credit these comics to')).toHaveValue('Petrichor Lin');
    await page.getByTestId('lyrefly-import-confirm').click();
    await expect(page.getByTestId('lyrefly-import-done')).toHaveText('Added 2 comics.', { timeout: 30000 });
    await page.getByRole('button', { name: 'Done' }).click();

    await expect(page.getByRole('textbox', { name: 'Pen name' })).toHaveValue('Petrichor Lin');
    await expect(page.getByRole('textbox', { name: 'Series title' })).toHaveValue('Slant of Rain');
    await page.getByRole('button', { name: 'Your comics', exact: true }).click();
    await expect(page.getByRole('button', { name: /Open Fighting/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Open 600 Million Steps/i })).toBeVisible();
  });

  test('uses riso cube theme on app root', async ({ page }) => {
    await expect(page.getByTestId('lyrefly-app')).toHaveAttribute('data-lyrefly-theme', 'risocube');
    await expect(page.getByTestId('lyrefly-design-picker')).toHaveCount(0);
  });

  test('switches between shelf and table views with shared toolbar', async ({ page }) => {
    await expect(page.getByTestId('lyrefly-shelf-toolbar')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('lyrefly-shelf-view-grid')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('lyrefly-shelf-view-table').click();
    await expect(page.getByTestId('lyrefly-shelf-table')).toBeVisible();
    await page.getByTestId('lyrefly-shelf-view-grid').click();
    await expect(page.getByRole('button', { name: /Open Midnight Courier/i })).toBeVisible();
  });
});
