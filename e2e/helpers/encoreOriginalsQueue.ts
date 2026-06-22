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

/** Stable Dexie seed + table view for Originals bulk-play / layout smokes. */
export async function gotoEncoreOriginalsQueue(page: Page): Promise<void> {
  await page.addInitScript((storageKey) => {
    window.localStorage.setItem(storageKey, 'table');
  }, ORIGINALS_VIEW_STORAGE_KEY);

  await page.goto('/encore/#/originals?e2eOriginalsQueue=1');
  await expect(page.getByRole('heading', { name: 'Originals' })).toBeVisible({ timeout: 15_000 });
  await seedOriginalsQueueFromPage(page);

  await expect(page.getByText('E2E Queue A', { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('E2E Queue B', { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('tbody tr')).toHaveCount(2, { timeout: 15_000 });
}
