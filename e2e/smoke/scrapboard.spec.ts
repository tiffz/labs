import { expect, test } from '@playwright/test';

test('scrapboard app loads', async ({ page }) => {
  await page.goto('/scrapboard/');
  await expect(page.getByTestId('scrapboard-app')).toBeVisible();
  await expect(page.getByTestId('scrapboard-board')).toBeVisible();
  await expect(page.getByTestId('scrapboard-layout-gallery')).toBeVisible();
  await expect(page.getByTestId('scrapboard-panel-text')).toBeVisible();
});

test('scrapboard panel count updates layout gallery', async ({ page }) => {
  await page.goto('/scrapboard/');
  await expect(page.getByTestId('scrapboard-layout-gallery')).toBeVisible();
  await page.getByTestId('scrapboard-randomize-all').click();
  await expect(page.getByTestId('scrapboard-board').getByTestId('comic-mockup-svg')).toBeVisible();
});

test('scrapboard dialogue blocks render bubbles', async ({ page }) => {
  await page.goto('/scrapboard/');
  await page.getByTestId('scrapboard-add-dialogue').click();
  await page.getByTestId('scrapboard-dialogue-text-0').fill('Hello from character A');
  await expect(page.getByTestId('scrapboard-board').locator('.comic-mockup-svg__bubble')).toContainText(
    /Hello\s+from/i,
  );
});

test('scrapboard main canvas renders all panels', async ({ page }) => {
  await page.goto('/scrapboard/');
  const board = page.getByTestId('scrapboard-board');
  await expect(board.getByTestId('comic-mockup-svg')).toBeVisible();
  const panels = board.locator('.comic-mockup-svg [data-panel-index]');
  await expect(panels).toHaveCount(4);
});

test('scrapboard randomize copy', async ({ page }) => {
  await page.goto('/scrapboard/');
  await page.getByTestId('scrapboard-randomize-text').click();
  await expect(page.getByTestId('scrapboard-board').getByTestId('comic-mockup-svg')).toBeVisible();
});
