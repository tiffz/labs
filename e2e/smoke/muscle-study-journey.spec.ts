import { test, expect } from '@playwright/test';
import { expectMuscleCanvasReady } from '../helpers/muscleCanvas';

async function setLayerPeelDepth(page: import('@playwright/test').Page, depth: 0 | 1 | 2 | 3) {
  await page.getByRole('slider', { name: 'Depth' }).fill(String(depth));
}

async function openStudyIndexIfCollapsed(page: import('@playwright/test').Page) {
  const index = page.getByTestId('muscle-study-index');
  const search = index.getByRole('searchbox');
  if (!(await search.isVisible())) {
    await index.locator('summary').click();
    await expect(search).toBeVisible();
  }
}

test.describe('Muscle Memory study journey', () => {
  test.describe.configure({ timeout: 180_000 });

  test('fundamentals warmup shows skeleton peel count', async ({ page }) => {
    await page.goto('/muscle/?module=fundamentals');
    await expectMuscleCanvasReady(page);

    await setLayerPeelDepth(page, 3);
    await expect(page.getByTestId('muscle-layer-status')).toContainText('Skeleton · 14 visible');
  });

  test('depth slider updates layer status for torso', async ({ page }) => {
    await page.goto('/muscle/?module=torso');
    await expect(page.getByRole('tab', { name: 'Torso', selected: true })).toBeVisible();

    await setLayerPeelDepth(page, 0);
    await expect(page.getByTestId('muscle-layer-status')).toContainText('Full muscle · 6 visible');

    await setLayerPeelDepth(page, 1);
    await expect(page.getByTestId('muscle-layer-status')).toContainText('Below surface · 3 visible');

    await setLayerPeelDepth(page, 2);
    await expect(page.getByTestId('muscle-layer-status')).toContainText('Deep muscles · 0 visible');

    await setLayerPeelDepth(page, 3);
    await expect(page.getByTestId('muscle-layer-status')).toContainText('Skeleton · 0 visible');
  });

  test('warmup auto-selects first structure and shows definition', async ({ page }) => {
    await page.goto('/muscle/?module=fundamentals');
    await expectMuscleCanvasReady(page);
    await expect(page.getByRole('heading', { name: 'Head & neck', level: 2 })).toBeVisible();

    const index = page.getByTestId('muscle-study-index');
    await openStudyIndexIfCollapsed(page);
    await index.getByRole('searchbox').fill('Sternum');
    await index.getByRole('button', { name: /Sternum/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Sternum', level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Definition', level: 3 })).toBeVisible();
    await expect(index).toBeVisible();
  });

  test('full body tab loads atlas view', async ({ page }) => {
    await page.goto('/muscle/');
    await expectMuscleCanvasReady(page);
    await expect(page.getByRole('tab', { name: 'Full body', selected: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Full body', level: 1 })).toBeVisible();
    await expect(page.getByText('Start lesson')).toHaveCount(0);
    await expect(page.getByTestId('muscle-layer-status')).toContainText('Full muscle', { timeout: 15_000 });
  });

  test('full body atlas shows structure card from browser', async ({ page }) => {
    await page.goto('/muscle/');
    await expectMuscleCanvasReady(page);
    await expect(page.getByTestId('muscle-layer-status')).toContainText('Full muscle', {
      timeout: 15_000,
    });

    const index = page.getByTestId('muscle-study-index');
    await openStudyIndexIfCollapsed(page);
    await expect(index.getByTestId('muscle-study-index-defer-hint')).toBeVisible();
    await index.getByRole('searchbox').fill('Pectoralis');
    await expect(index.getByTestId('muscle-study-index-defer-hint')).toBeHidden();
    const row = index
      .locator('.muscle-study-index__list')
      .getByRole('button', { name: 'M Pectoralis major', exact: true });
    await expect(row).toBeVisible();
    await row.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('muscle-structure-focus')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('heading', { name: 'Pectoralis major', level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Definition', level: 3 })).toBeVisible();
    await expect(index).toBeVisible();
  });
});

test.describe('Muscle Memory active reps (seeded)', () => {
  test('e2e seed unlocks active reps and starts a quiz deck', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/muscle/?e2eSeed=1&module=fundamentals');
    await expect(page.getByTestId('muscle-workout-panel')).toBeVisible();

    const activeTab = page.getByRole('tab', { name: 'Active Reps' });
    await expect(activeTab).toBeEnabled({ timeout: 10_000 });
    await activeTab.click();
    await expect(activeTab).toHaveAttribute('aria-selected', 'true');

    await expect(page.getByRole('group', { name: 'Structure choices' })).toBeVisible();
    await expect(page.getByText(/Tap the highlighted structure/i)).toBeVisible();
  });
});
