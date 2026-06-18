import type { Page } from '@playwright/test';

const E2E_DRIVE_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Expose-Headers': 'ETag',
};

export const E2E_ZINEBOX_DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/folders/e2eZineboxImportFolderId01';

const E2E_FOLDER_ID = 'e2eZineboxImportFolderId01';
const E2E_PDF_ID = 'e2eZineboxImportPdfFile0001';

/** Minimal valid PDF for IndexedDB import (cover extraction may fail; import still proceeds). */
const MINIMAL_PDF_BYTES = Buffer.from(
  '%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n%%EOF',
);

/** Persist a Google session and stub GIS token client for Drive import (upgradeScopes path). */
export async function seedZineboxE2eGoogleSession(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const expiresAtMs = Date.now() + 3_600_000;
    const token = 'e2e-zinebox-drive-import-token';
    window.localStorage.setItem(
      'encore_google_oauth_v1',
      JSON.stringify({ accessToken: token, expiresAtMs }),
    );
    window.localStorage.setItem(
      'encore_google_identity_v1',
      JSON.stringify({
        email: 'e2e-zinebox@test.example',
        displayName: 'E2E Zinebox',
        rememberedAtMs: Date.now(),
      }),
    );

    const mockGoogle = {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            callback: (resp: { access_token: string; expires_in: number }) => void;
            error_callback?: (detail: { type?: string }) => void;
          }) => {
            const client = {
              callback: config.callback,
              error_callback: config.error_callback,
              requestAccessToken: () => {
                client.callback({ access_token: token, expires_in: 3600 });
              },
            };
            return client;
          },
        },
      },
    };
    Object.defineProperty(window, 'google', {
      configurable: true,
      writable: true,
      value: mockGoogle,
    });
  });
}

/**
 * Minimal Drive API stub for Zine Box folder PDF import — one folder, one new PDF.
 */
export async function stubZineboxDriveFolderImportApi(page: Page): Promise<void> {
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();

    if (url.includes('accounts.google.com/gsi/client')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        headers: E2E_DRIVE_CORS_HEADERS,
        body: '/* e2e GIS stub — window.google installed via addInitScript */',
      });
      return;
    }

    if (url.includes('oauth2/v2/userinfo')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: E2E_DRIVE_CORS_HEADERS,
        body: JSON.stringify({
          email: 'e2e-zinebox@test.example',
          name: 'E2E Zinebox',
          given_name: 'E2E',
        }),
      });
      return;
    }

    if (
      url.includes('googleapis.com/drive/v3/files') &&
      method === 'GET' &&
      url.includes(E2E_PDF_ID)
    ) {
      if (url.includes('alt=media')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/pdf',
          headers: E2E_DRIVE_CORS_HEADERS,
          body: MINIMAL_PDF_BYTES,
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: E2E_DRIVE_CORS_HEADERS,
        body: JSON.stringify({
          id: E2E_PDF_ID,
          name: 'e2e-sample-zine.pdf',
          mimeType: 'application/pdf',
          modifiedTime: '2026-01-01T00:00:00.000Z',
          size: String(MINIMAL_PDF_BYTES.length),
        }),
      });
      return;
    }

    if (
      url.includes('googleapis.com/drive/v3/files') &&
      method === 'GET' &&
      url.includes(E2E_FOLDER_ID) &&
      !url.includes('alt=media') &&
      !url.includes('?q=')
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: E2E_DRIVE_CORS_HEADERS,
        body: JSON.stringify({
          id: E2E_FOLDER_ID,
          name: 'E2E Zine Folder',
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });
      return;
    }

    if (
      url.includes('googleapis.com/drive/v3/files') &&
      method === 'GET' &&
      url.includes('q=') &&
      !url.includes('alt=media')
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: E2E_DRIVE_CORS_HEADERS,
        body: JSON.stringify({
          files: [
            {
              id: E2E_PDF_ID,
              name: 'e2e-sample-zine.pdf',
              mimeType: 'application/pdf',
              modifiedTime: '2026-01-01T00:00:00.000Z',
              parents: [E2E_FOLDER_ID],
              size: String(MINIMAL_PDF_BYTES.length),
            },
          ],
          incompleteSearch: false,
        }),
      });
      return;
    }

    if (
      url.includes('googleapis.com/drive/v3/files') &&
      method === 'GET' &&
      url.includes('alt=media')
    ) {
      // Fallback for URL shapes that omit the file id in the matched segment above.
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        headers: E2E_DRIVE_CORS_HEADERS,
        body: MINIMAL_PDF_BYTES,
      });
      return;
    }

    await route.continue();
  });
}
