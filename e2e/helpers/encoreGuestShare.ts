import type { Page } from '@playwright/test';

/** Stable Drive file id for guest share smokes (never a real file). */
export const E2E_GUEST_SNAPSHOT_FILE_ID = 'e2eEncoreGuestSnapshot01';

const E2E_GUEST_SNAPSHOT = {
  version: 1,
  generatedAt: '2026-01-01T00:00:00.000Z',
  ownerDisplayName: 'E2E',
  songs: [
    {
      id: 'e2e-song-1',
      title: 'Guest Smoke Song',
      artist: 'Test Artist',
    },
  ],
  performances: [],
} as const;

const SNAPSHOT_JSON = JSON.stringify(E2E_GUEST_SNAPSHOT);

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

/**
 * Stub guest snapshot reads for Encore `#/share/<fileId>`.
 * Serves fixture JSON on dev Vite proxy or session BFF paths.
 * Aborts direct `googleapis.com/drive` `alt=media` so prod-style regressions fail fast.
 */
export async function stubEncoreGuestSnapshotFetch(page: Page, fileId = E2E_GUEST_SNAPSHOT_FILE_ID): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as { __encoreGuestShareDirectGoogleHits?: string[] }).__encoreGuestShareDirectGoogleHits = [];
  });

  await page.route('https://www.googleapis.com/drive/v3/**', async (route) => {
    const url = route.request().url();
    if (url.includes('alt=media')) {
      await page.evaluate((hit) => {
        (window as unknown as { __encoreGuestShareDirectGoogleHits?: string[] }).__encoreGuestShareDirectGoogleHits?.push(hit);
      }, url);
      await route.abort('failed');
      return;
    }
    await route.continue();
  });

  await page.route(`**/__encore/drive-public/${encodeURIComponent(fileId)}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: CORS_HEADERS,
      body: SNAPSHOT_JSON,
    });
  });

  await page.route(`**/v1/public-drive/files/${encodeURIComponent(fileId)}/media**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: CORS_HEADERS,
      body: SNAPSHOT_JSON,
    });
  });
}

export async function readDirectGoogleDriveHits(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __encoreGuestShareDirectGoogleHits?: string[] }).__encoreGuestShareDirectGoogleHits ?? []);
}
