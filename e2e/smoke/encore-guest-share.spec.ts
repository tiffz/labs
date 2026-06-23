import { test, expect } from '@playwright/test';
import {
  E2E_GUEST_SNAPSHOT_FILE_ID,
  readDirectGoogleDriveHits,
  stubEncoreGuestSnapshotFetch,
} from '../helpers/encoreGuestShare';

/**
 * Guest share is a P0 surface: static hosting must not call Google Drive directly from the browser.
 * This smoke stubs the dev proxy / BFF path and fails when the app hits googleapis.com instead.
 */
test.describe('Encore guest share preview', () => {
  test('loads snapshot via proxied fetch without direct googleapis.com Drive calls', async ({ page }) => {
    await stubEncoreGuestSnapshotFetch(page);
    await page.goto(`/encore/#/share/${E2E_GUEST_SNAPSHOT_FILE_ID}`);

    await expect(page.getByRole('heading', { name: /E2E.*Repertoire/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Guest Smoke Song')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Couldn.*open this snapshot/i })).toHaveCount(0);

    const directGoogleHits = await readDirectGoogleDriveHits(page);
    expect(directGoogleHits, 'guest share must not fetch googleapis.com/drive alt=media in the browser').toEqual([]);
  });
});
