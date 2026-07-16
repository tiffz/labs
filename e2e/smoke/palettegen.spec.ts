import { expect, test } from '@playwright/test';

test('palettegen app loads with full bleed palette', async ({ page }) => {
  await page.goto('/palette/');
  await expect(page.getByTestId('palettegen-app')).toBeVisible();
  await expect(page.getByTestId('palettegen-bleed')).toBeVisible();
  await expect(page.getByTestId('palettegen-swatches')).toBeVisible();
  await expect(page.getByTestId('palettegen-thumbs')).toBeVisible();
  await expect(page.getByTestId('palettegen-toolbar')).toBeVisible();
});

test('palettegen seed harmonies update gallery', async ({ page }) => {
  await page.goto('/palette/');
  await page.getByTestId('palettegen-mode-seed').click();
  await expect(page.getByTestId('palettegen-thumbs')).toBeVisible();
  await expect(page.getByTestId('palettegen-swatches')).toBeVisible();
});

test('palettegen regenerate palettes', async ({ page }) => {
  await page.goto('/palette/');
  await page.getByTestId('palettegen-regenerate').click();
  await expect(page.getByTestId('palettegen-thumbs')).toBeVisible();
});

test('palettegen settings panel uses app sans-serif typography', async ({ page }) => {
  await page.goto('/palette/');
  await page.getByTestId('palettegen-style-menu').click();
  const settings = page.getByTestId('palettegen-settings');
  await expect(settings).toBeVisible();
  const titleFont = await settings.locator('.palettegen-style-panel__title').evaluate((el) => getComputedStyle(el).fontFamily);
  expect(titleFont.toLowerCase()).toMatch(/inter|system-ui|sf pro|segoe ui/);
});

test('palettegen stripe click copies hex', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/palette/');
  await page.getByTestId('palettegen-regenerate').click();
  await page.locator('.palettegen-bleed__stripe').first().click();
  await expect(page.locator('.palettegen-sr-status')).toContainText(/^Copied #/);
});

test('palettegen stripe seed generates palette from color', async ({ page }) => {
  await page.goto('/palette/?colors=ff0000,00ff00,0000ff');
  await page.getByTestId('palettegen-stripe-swatch-1').hover();
  await page.getByTestId('palettegen-stripe-seed-swatch-1').click();
  await expect(page.getByTestId('palettegen-mode-seed')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('palettegen-thumbs')).toBeVisible();
  await expect(page.locator('.palettegen-sr-status')).toContainText('Seed palette from');
});

test('palettegen loads shared palette from URL', async ({ page }) => {
  await page.goto('/palette/?colors=ff0000,00ff00,0000ff');
  const firstStripe = page.locator('.palettegen-bleed__stripe').first();
  await expect(firstStripe).toHaveCSS('background-color', 'rgb(255, 0, 0)');
});

test('palettegen arrow keys navigate thumbnails', async ({ page }) => {
  await page.goto('/palette/');
  await expect(page.getByTestId('palettegen-thumbs')).toBeVisible();

  const thumbs = page.locator('[data-testid^="palettegen-thumb-"]');
  await expect(thumbs.first()).toHaveClass(/palettegen-thumbs__item--active/);

  await page.getByTestId('palettegen-drop-layer').click();
  await page.keyboard.press('ArrowRight');
  await expect(thumbs.nth(1)).toHaveClass(/palettegen-thumbs__item--active/);
});

test('palettegen gallery prev/next buttons navigate palettes', async ({ page }) => {
  await page.goto('/palette/');
  await expect(page.getByTestId('palettegen-thumbs')).toBeVisible();
  const counter = page.locator('.palettegen-thumbs__counter');
  const before = await counter.textContent();
  await page.getByTestId('palettegen-gallery-next').click();
  await expect(counter).not.toHaveText(before ?? '');
});

test('palettegen legacy /palettegen/ URL redirects to /palette/', async ({ page }) => {
  await page.goto('/palettegen/?colors=ff0000,00ff00,0000ff');
  await expect(page).toHaveURL(/\/palette\/\?colors=ff0000/);
  await expect(page.getByTestId('palettegen-app')).toBeVisible();
});

test('palettegen regenerate undo restores previous gallery', async ({ page }) => {
  await page.goto('/palette/');
  await page.getByTestId('palettegen-regenerate').click();
  const stripe = page.locator('.palettegen-bleed__stripe').first();
  const firstHex = await stripe.evaluate((el) => getComputedStyle(el).backgroundColor);

  // Random regenerate can rarely land on the same lead stripe; click until it changes.
  let secondHex = firstHex;
  let extraRegenerates = 0;
  for (let attempt = 0; attempt < 8 && secondHex === firstHex; attempt++) {
    await page.getByTestId('palettegen-regenerate').click();
    extraRegenerates += 1;
    secondHex = await stripe.evaluate((el) => getComputedStyle(el).backgroundColor);
  }
  expect(secondHex).not.toBe(firstHex);

  const undoKey = process.platform === 'darwin' ? 'Meta+z' : 'Control+z';
  for (let i = 0; i < extraRegenerates; i++) {
    await page.keyboard.press(undoKey);
  }
  await expect(stripe).toHaveCSS('background-color', firstHex);
  await expect(page.locator('.palettegen-sr-status')).toContainText('Restored previous palettes');
});

test('palettegen arrow keys work after focusing a color stripe', async ({ page }) => {
  await page.goto('/palette/');
  await page.locator('.palettegen-bleed__stripe').first().click();
  await page.keyboard.press('ArrowRight');
  const thumbs = page.locator('[data-testid^="palettegen-thumb-"]');
  await expect(thumbs.nth(1)).toHaveClass(/palettegen-thumbs__item--active/);
});
