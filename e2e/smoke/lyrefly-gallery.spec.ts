import { expect, test } from '@playwright/test';

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
