import { expect, test } from '@playwright/test';

/** Lyrefly (ADR 0030): uploaded page art is staged for review and becomes a page only on confirm. */
const PROJECT = 'e2e00000-0000-4000-8000-00000e2e0001';
// 1x1 transparent PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

test('uploaded pages are added only after "Add page"', async ({ page }) => {
  await page.goto(`/lyrefly/?e2eSeed=1#/project/${PROJECT}/art`);
  const grid = page.getByTestId('lyrefly-art-page-grid');
  await expect(grid).toBeVisible({ timeout: 15_000 });
  const pages = grid.locator('.lyrefly-art-grid__tile:not(.lyrefly-art-grid__tile--action)');
  const before = await pages.count();

  await page
    .getByTestId('lyrefly-art-page-upload')
    .locator('input[type="file"]')
    .setInputFiles({ name: 'p09.png', mimeType: 'image/png', buffer: PNG });

  const review = page.getByRole('region', { name: 'Pages ready to add' });
  await expect(review.getByText('p09.png')).toBeVisible();
  await expect(review.getByText(/Adds a new page/)).toBeVisible();
  await expect(pages).toHaveCount(before);

  await review.getByRole('button', { name: 'Add page' }).click();
  await expect(review).toBeHidden({ timeout: 15_000 });
  await expect(pages).toHaveCount(before + 1);
});
