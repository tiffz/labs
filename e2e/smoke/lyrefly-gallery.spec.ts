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
    await expect(page.getByRole('button', { name: /Script/i })).toBeVisible();
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

  test('uses riso cube theme on app root', async ({ page }) => {
    await expect(page.getByTestId('lyrefly-app')).toHaveAttribute('data-lyrefly-theme', 'risocube');
    await expect(page.getByTestId('lyrefly-design-picker')).toHaveCount(0);
  });
});
