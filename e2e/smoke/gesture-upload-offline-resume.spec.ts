import { test, expect } from '@playwright/test';
import { prepareGestureE2ePage } from '../helpers/gesturePreviewFixtures';
import {
  seedGestureE2eGoogleSession,
  stubGestureDriveUploadApi,
} from '../helpers/gestureUploadOfflineResume';

/**
 * Upload resume after connectivity loss — manifest + staged blobs, no folder re-pick.
 */
test.describe('Gesture upload offline resume', () => {
  test('waits offline then completes when connectivity returns', async ({ page, context }) => {
    test.setTimeout(60_000);
    await seedGestureE2eGoogleSession(page);
    const driveStub = await stubGestureDriveUploadApi(page);
    await prepareGestureE2ePage(page);

    await page.goto('/gesture/?e2eInterruptedUpload=1#/collections');

    const banner = page.locator('.gesture-interrupted-upload');
    await expect(banner).toBeVisible({ timeout: 15_000 });
    await expect(banner).toContainText('Upload interrupted');
    await expect(banner).toContainText('staged photos in this browser');

    driveStub.setBlockDriveRequests(true);
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Continue upload' }).click();

    const snackbar = page.locator('.labs-blocking-job-snackbar');
    await expect(snackbar).toContainText(/Waiting for internet/i, { timeout: 20_000 });

    driveStub.setBlockDriveRequests(false);
    await context.setOffline(false);

    await expect(page.getByText(/Upload complete|Uploaded \d+ more photo/i)).toBeVisible({
      timeout: 45_000,
    });
    await expect(banner).toBeHidden({ timeout: 15_000 });
  });
});
