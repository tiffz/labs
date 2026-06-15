import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** 1×1 PNG for Playwright image route stubs. */
export const GESTURE_E2E_TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64',
);

export { GESTURE_E2E_PACK_ID, GESTURE_E2E_COVER_IDS } from '../../src/gesture/e2e/gestureE2eSeed';

/** Clear persisted practice config so e2e seed packs are not hidden by tag filters. */
export async function prepareGestureE2ePage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.removeItem('gesture-practice-session-config');
  });
}
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

/** Collect console errors for the rest of the test (attach before navigation). */
export function collectPageConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

/** Preview strips must use stable https URLs — never revocable blob object URLs. */
export async function assertGesturePreviewStripHttps(
  strip: Locator,
  expectedVisibleCount: number,
): Promise<void> {
  await expect.poll(async () => strip.locator('img.gesture-preview-image.is-visible').count(), {
    timeout: 15_000,
  }).toBe(expectedVisibleCount);

  const imgs = strip.locator('img.gesture-preview-image.is-visible');
  const count = await imgs.count();
  expect(count).toBe(expectedVisibleCount);

  for (let i = 0; i < count; i += 1) {
    const src = await imgs.nth(i).getAttribute('src');
    expect(src, `preview image ${i} src`).toMatch(/^https:/);
    expect(src, `preview image ${i} src`).not.toMatch(/^blob:/);
  }
}
