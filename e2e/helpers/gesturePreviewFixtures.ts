import type { Page } from '@playwright/test';

/** 1×1 PNG for Playwright image route stubs. */
export const GESTURE_E2E_TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64',
);

export { GESTURE_E2E_PACK_ID, GESTURE_E2E_COVER_IDS } from '../../src/gesture/e2e/gestureE2eSeed';

/** Stub Drive thumbnail URLs for Gesture e2e smokes. */
export async function stubGestureDriveThumbnailImages(page: Page): Promise<void> {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.includes('drive.google.com/thumbnail') || url.includes('googleusercontent.com')) {
      await route.fulfill({ status: 200, contentType: 'image/png', body: GESTURE_E2E_TINY_PNG });
      return;
    }
    await route.continue();
  });
}
