import { expect, test } from '@playwright/test';

test('scrapboard app loads', async ({ page }) => {
  await page.goto('/scrapboard/');
  await expect(page.getByTestId('scrapboard-app')).toBeVisible();
  await expect(page.getByTestId('scrapboard-board')).toBeVisible();
  await expect(page.getByTestId('scrapboard-layout-gallery')).toBeVisible();
  await expect(page.getByTestId('scrapboard-panel-text')).toBeVisible();
  await expect(page.getByTestId('scrapboard-page-finish')).toBeVisible();
  await expect(page.getByTestId('scrapboard-arrangement-field')).toBeVisible();
  await expect(page.getByTestId('scrapboard-page-finish-cast')).toBeVisible();
});

test('scrapboard panel count updates layout gallery', async ({ page }) => {
  await page.goto('/scrapboard/');
  await expect(page.getByTestId('scrapboard-layout-gallery')).toBeVisible();
  await page.getByTestId('scrapboard-randomize-menu').click();
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
  await page.getByTestId('scrapboard-randomize-menu').click();
  await page.getByTestId('scrapboard-randomize-text').click();
  await expect(page.getByTestId('scrapboard-board').getByTestId('comic-mockup-svg')).toBeVisible();
});

test('scrapboard cast, speakers, and arrangement', async ({ page }) => {
  await page.goto('/scrapboard/');

  await page.getByTestId('scrapboard-page-finish-cast').click();
  await expect(page.getByTestId('scrapboard-page-finish-cast-menu')).toBeVisible();
  await page.getByTestId('scrapboard-cast-add').click();
  await expect(page.getByTestId('scrapboard-page-finish-cast')).toContainText(/Cast \(4\)/);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('scrapboard-page-finish-cast-menu')).toBeHidden();

  const speakers = page.getByTestId('scrapboard-panel-speakers');
  await expect(speakers).toBeVisible();
  const speakerChips = speakers.locator('button[data-testid^="scrapboard-panel-speaker-"]');
  await expect(speakerChips.first()).toBeVisible();

  await page.getByTestId('scrapboard-arrangement-trigger').click();
  await expect(page.getByTestId('scrapboard-arrangement-menu')).toBeVisible();
  await page.getByTestId('scrapboard-arrangement-side-by-side').click();
  await expect(page.getByTestId('scrapboard-arrangement-trigger')).toContainText(/Side by side/i);

  await page.getByTestId('scrapboard-add-dialogue').click();
  await page.getByTestId('scrapboard-dialogue-text-0').fill('Cast line');
  await expect(page.getByTestId('scrapboard-board').locator('.comic-mockup-svg__bubble')).toContainText(
    /Cast\s+line/i,
  );
});

test('scrapboard layout strip stays available after pick', async ({ page }) => {
  await page.goto('/scrapboard/');
  const gallery = page.getByTestId('scrapboard-layout-gallery');
  const thumbs = gallery.locator('button[aria-pressed]');
  await expect(thumbs.first()).toBeVisible();
  const countBefore = await thumbs.count();
  expect(countBefore).toBeGreaterThan(1);
  await thumbs.nth(1).click();
  await expect(thumbs.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(thumbs).toHaveCount(countBefore);
});
