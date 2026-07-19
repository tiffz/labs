import { test, expect } from '@playwright/test';
import { enterEncoreApp } from './helpers/enterEncoreApp';

test.describe('Encore Originals', () => {
  test.beforeEach(async ({ page }) => {
    await enterEncoreApp(page);
  });

  test('navigates to originals tab and creates blank draft', async ({ page }) => {
    await page.goto('/encore/#/originals');
    await expect(page.getByRole('heading', { name: 'Originals' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'New Original' }).click();
    const titleField = page.getByPlaceholder('Untitled original');
    await expect(titleField).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/#\/originals\/(?!new)[^/?#]+$/, { timeout: 15_000 });
    await page.getByRole('button', { name: 'Write lyrics' }).click();
    const lyricsChart = page.getByLabel('Lyrics chart');
    await expect(lyricsChart).toBeVisible({ timeout: 10_000 });
    await lyricsChart.fill('[Verse 1]\nTest line\n\n[Chorus]\n');
    // Write mode reconciles to chordPro on a debounce before persisting. Instead of
    // sleeping past the debounce (flaky on slow CI), poll IndexedDB until the draft
    // is actually persisted, then reload.
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const rows = await new Promise<{ lyricsAndChords?: string }[]>((resolve, reject) => {
              const open = indexedDB.open('encore-repertoire');
              open.onerror = () => reject(open.error);
              open.onsuccess = () => {
                const db = open.result;
                try {
                  const tx = db.transaction('originals', 'readonly');
                  const req = tx.objectStore('originals').getAll();
                  req.onsuccess = () => {
                    db.close();
                    resolve(req.result as { lyricsAndChords?: string }[]);
                  };
                  req.onerror = () => {
                    db.close();
                    reject(req.error);
                  };
                } catch (err) {
                  db.close();
                  reject(err);
                }
              };
            });
            return rows.some((row) => (row.lyricsAndChords ?? '').includes('Test line'));
          }),
        { timeout: 10_000, message: 'original draft persisted to IndexedDB' },
      )
      .toBe(true);
    await page.reload();
    await page.getByRole('button', { name: 'Write lyrics' }).click();
    await expect(lyricsChart).toHaveValue(/\[Verse 1\][\s\S]*Test line/, { timeout: 10_000 });
  });

  test('does not persist empty original when navigating away without edits', async ({ page }) => {
    await page.goto('/encore/#/originals');
    await expect(page.getByRole('heading', { name: 'Originals' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'New Original' }).click();
    await expect(page.getByPlaceholder('Untitled original')).toBeVisible({ timeout: 10_000 });
    await page.getByLabel('Back to originals').click();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Originals' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Untitled original')).toHaveCount(0);
  });
});
