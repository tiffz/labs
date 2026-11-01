import { test, expect } from '../labsTest';
import { prepareGestureE2ePage } from '../helpers/gesturePreviewFixtures';
import { seedGestureE2eGoogleSession, stubGestureDriveUploadApi } from '../helpers/gestureUploadOfflineResume';

/**
 * Gesture (ADR 0030): picked photos are reviewed as one collection row, and nothing reaches Drive
 * until "Upload".
 */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

test('picked photos stage as one collection and upload only on confirm', async ({ page }) => {
  test.setTimeout(60_000);
  await seedGestureE2eGoogleSession(page);
  await stubGestureDriveUploadApi(page);
  let uploadRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes('upload/drive')) uploadRequests += 1;
  });
  await prepareGestureE2ePage(page);
  await page.goto('/gesture/#/collections');

  const picker = page.locator('input[type="file"][multiple]:not([webkitdirectory])').first();
  await expect(picker).toBeAttached({ timeout: 15_000 });
  await picker.setInputFiles([
    { name: 'pose-1.png', mimeType: 'image/png', buffer: PNG },
    { name: 'pose-2.png', mimeType: 'image/png', buffer: PNG },
  ]);

  const review = page.getByRole('region', { name: 'Photos ready to upload' });
  await expect(review.getByText(/New collection · 2 photos/)).toBeVisible();
  expect(uploadRequests).toBe(0);

  await review.getByRole('button', { name: 'Upload 2 photos' }).click();
  await expect(review).toBeHidden({ timeout: 15_000 });
  await expect.poll(() => uploadRequests, { timeout: 30_000 }).toBeGreaterThan(0);
});
