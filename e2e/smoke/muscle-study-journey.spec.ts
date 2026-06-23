import { test, expect } from '@playwright/test';

async function setLayerPeelDepth(page: import('@playwright/test').Page, depth: 0 | 1 | 2 | 3) {
  const slider = page.getByRole('slider', { name: 'Depth' });
  await slider.fill(String(depth));
}

async function openStructureBrowser(page: import('@playwright/test').Page): Promise<void> {
  const details = page.locator('.muscle-structure-browser-details');
  await details.evaluate((element) => {
    (element as HTMLDetailsElement).open = true;
  });
}

test.describe('Muscle Memory study journey', () => {
  test('fundamentals warmup shows skeleton peel count', async ({ page }) => {
    await page.goto('/muscle/?module=fundamentals');
    await expect(page.getByTestId('muscle-app')).toBeVisible();
    await expect(page.getByTestId('muscle-training-canvas')).toBeVisible();

    await setLayerPeelDepth(page, 3);
    await expect(page.getByTestId('muscle-layer-status')).toContainText('Skeleton · 12 visible');
  });

  test('depth slider updates layer status for torso', async ({ page }) => {
    await page.goto('/muscle/?module=torso');
    await expect(page.getByRole('tab', { name: 'Torso', selected: true })).toBeVisible();

    await setLayerPeelDepth(page, 0);
    await expect(page.getByTestId('muscle-layer-status')).toContainText('All layers · 7 visible');

    await setLayerPeelDepth(page, 1);
    await expect(page.getByTestId('muscle-layer-status')).toContainText('Under the skin · 4 visible');

    await setLayerPeelDepth(page, 2);
    await expect(page.getByTestId('muscle-layer-status')).toContainText('Deep muscles · 1 visible');

    await setLayerPeelDepth(page, 3);
    await expect(page.getByTestId('muscle-layer-status')).toContainText('Skeleton · 1 visible');
  });

  test('warmup selects first structure and shows drawing notes', async ({ page }) => {
    await page.goto('/muscle/?module=fundamentals');
    await expect(page.getByTestId('muscle-workout-panel')).toBeVisible();
    await openStructureBrowser(page);
    await page.getByRole('button', { name: 'B Skull' }).click();
    await expect(page.getByRole('heading', { name: 'Skull', level: 2 })).toBeVisible();
    await expect(page.getByText(/Why it matters:/i)).toBeVisible();
  });

  test('full body tab loads atlas view', async ({ page }) => {
    await page.goto('/muscle/');
    await expect(page.getByTestId('muscle-app')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Full body', selected: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Full body', level: 1 })).toBeVisible();
    await expect(page.getByTestId('muscle-training-canvas')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('muscle-layer-status')).toContainText('All layers', { timeout: 15_000 });
  });
});

test.describe('Muscle Memory active reps (seeded)', () => {
  test('e2e seed unlocks active reps and starts a quiz deck', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/muscle/?e2eSeed=1');
    await expect(page.getByTestId('muscle-workout-panel')).toBeVisible();

    const activeTab = page.getByRole('tab', { name: 'Active Reps' });
    await expect(activeTab).toBeEnabled({ timeout: 10_000 });
    await activeTab.click();
    await expect(activeTab).toHaveAttribute('aria-selected', 'true');

    await expect(page.getByRole('group', { name: 'Structure choices' })).toBeVisible();
    await expect(page.getByText(/Tap the highlighted structure/i)).toBeVisible();
  });
});
