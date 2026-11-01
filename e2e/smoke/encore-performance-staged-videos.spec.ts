import { test, expect } from '../labsTest';
import { enterEncoreApp } from '../helpers/enterEncoreApp';
import { seedZineboxE2eGoogleSession } from '../helpers/zineboxDriveImport';
import { stubEncoreSignedInDrive } from '../helpers/encoreDriveStub';
import { openNewPerformance } from '../helpers/encorePerformanceEditor';

/**
 * The performance editor stages device videos through the shared upload code (ADR 0030): a file
 * that is not a video stays listed with the reason instead of vanishing, nothing uploads until
 * Save, and Save uploads only the videos.
 */
test('picked videos stage until Save; a non-video stays listed with the reason', async ({ page }) => {
  test.setTimeout(60_000);
  await seedZineboxE2eGoogleSession(page);
  const drive = await stubEncoreSignedInDrive(page, {});
  await enterEncoreApp(page);
  const editor = await openNewPerformance(page);

  await editor.locator('input[type="file"]').setInputFiles({
    name: 'Gig night.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.from('e2e video bytes'),
  });
  const queue = editor.getByLabel('Videos to upload');
  await expect(queue.getByText('Gig night.mp4')).toBeVisible();
  await expect(queue.getByText('Uploads when you save')).toBeVisible();

  // The OS picker enforces `accept`, so a non-video arrives by drop: a video plus a text file.
  await queue.evaluate((target) => {
    const data = new DataTransfer();
    data.items.add(new File(['more video'], 'Encore.mp4', { type: 'video/mp4' }));
    data.items.add(new File(['not a video'], 'setlist.txt', { type: 'text/plain' }));
    for (const type of ['dragenter', 'dragover', 'drop']) {
      target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: data }));
    }
  });
  await expect(queue.getByText('Encore.mp4')).toBeVisible();
  await expect(queue.getByText('setlist.txt')).toBeVisible();
  await expect(queue.getByText("That file isn't a video.")).toBeVisible();
  expect(drive.uploads).toEqual([]);

  await editor.getByRole('button', { name: 'Save' }).click();
  await expect(editor).toBeHidden({ timeout: 15_000 });
  // Both videos upload; the text file never does.
  expect(drive.uploads).toHaveLength(2);
  expect(drive.uploads.every((name) => name.endsWith('.mp4'))).toBe(true);
});
