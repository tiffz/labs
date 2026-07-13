import { expect, test } from '@playwright/test';

test('lyrefly sketchbook tab', async ({ page }) => {
  await page.goto('/lyrefly/?e2eSeed=1');
  await page.getByTestId('lyrefly-sketchbook-tab').click();
  await expect(page).toHaveURL(/#\/sketchbook/);
  await expect(page.getByTestId('lyrefly-sketchbook')).toBeVisible();
});

test('lyrefly thumbs stage', async ({ page }) => {
  await page.goto('/lyrefly/?e2eSeed=1#/project/e2e00000-0000-4000-8000-00000e2e0001/thumbs');
  await expect(page.getByTestId('lyrefly-thumbs-stage')).toBeVisible();
  await expect(page.getByTestId('lyrefly-thumbs-mockup')).toBeVisible();
});
