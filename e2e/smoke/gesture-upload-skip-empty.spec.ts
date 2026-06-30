import { test, expect } from '@playwright/test';
import { prepareGestureE2ePage } from '../helpers/gesturePreviewFixtures';
import {
  seedGestureE2eGoogleSession,
  stubGestureDriveUploadApi,
} from '../helpers/gestureUploadOfflineResume';

/**
 * Resume must skip 0-byte manifest rows instead of aborting the whole upload.
 */
test.describe('Gesture upload skip empty files', () => {
  test('continues interrupted upload when manifest includes a 0-byte placeholder', async ({ page }) => {
    test.setTimeout(60_000);
    await seedGestureE2eGoogleSession(page);
    await stubGestureDriveUploadApi(page);
    await prepareGestureE2ePage(page);

    await page.goto('/gesture/?e2eInterruptedUploadEmpty=1#/collections');

    const banner = page.locator('.gesture-interrupted-upload');
    await expect(banner).toBeVisible({ timeout: 15_000 });
    await expect(banner).toContainText('Upload interrupted');
    await expect(banner).toContainText('staged photos in this browser');

    await page.getByRole('button', { name: 'Continue upload' }).click();

    await expect(page.getByText(/Cannot upload an empty file/i)).toHaveCount(0);
    await expect(page.getByText(/Upload complete|Uploaded 1 more photo/i)).toBeVisible({
      timeout: 45_000,
    });
    await expect(banner).toBeHidden({ timeout: 15_000 });
  });
});
