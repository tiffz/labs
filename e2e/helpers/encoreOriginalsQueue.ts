import { expect, type Page } from '@playwright/test';

const ORIGINALS_VIEW_STORAGE_KEY = 'encore.originals.libraryView';

async function seedOriginalsQueueFromPage(page: Page): Promise<void> {
  await page.waitForFunction(
    () => typeof window.__labsSeedOriginalsQueueE2e === 'function',
    undefined,
    { timeout: 15_000 },
  );
  await page.evaluate(async () => {
    await window.__labsSeedOriginalsQueueE2e?.();
  });
}

/** Stable Dexie seed for Originals bulk-play / layout smokes. */
export async function gotoEncoreOriginalsQueue(
  page: Page,
  options?: { viewMode?: 'table' | 'grid' },
): Promise<void> {
  const viewMode = options?.viewMode ?? 'table';
  await page.addInitScript(({ storageKey, mode }) => {
    window.localStorage.setItem(storageKey, mode);
  }, { storageKey: ORIGINALS_VIEW_STORAGE_KEY, mode: viewMode });

  await page.goto('/encore/#/originals?e2eOriginalsQueue=1');
  await expect(page.getByRole('heading', { name: 'Originals' })).toBeVisible({ timeout: 15_000 });
  await seedOriginalsQueueFromPage(page);

  await expect(page.getByText('E2E Queue A', { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('E2E Queue B', { exact: true })).toBeVisible({ timeout: 10_000 });

  if (viewMode === 'grid') {
    await page.getByRole('button', { name: 'Song dashboard' }).click();
    await expect(page.getByTestId('originals-song-dashboard')).toBeVisible({ timeout: 15_000 });
  } else {
    await expect(page.locator('tbody tr')).toHaveCount(2, { timeout: 15_000 });
  }
}

/**
 * Open a seeded original at a workflow stage. Demo-ready songs (any song with a take) open in View
 * mode, which hides the stage stepper, so switch to Write first when needed.
 */
export async function openSeededOriginalStage(page: Page, title: string, stage: string): Promise<void> {
  await page.getByText(title, { exact: true }).click();
  const writeMode = page.getByRole('button', { name: 'Write mode' });
  await expect(writeMode).toBeVisible({ timeout: 15_000 });
  if ((await writeMode.getAttribute('aria-pressed')) !== 'true') await writeMode.click();
  await page.getByRole('button', { name: stage }).click();
}
