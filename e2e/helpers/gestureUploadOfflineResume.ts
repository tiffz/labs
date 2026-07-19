import type { Page } from '@playwright/test';

const E2E_GOOGLE_TOKEN = 'e2e-gesture-upload-token';

function e2eRequestHostname(raw: string): string | null {
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isGoogleApisHost(raw: string): boolean {
  const host = e2eRequestHostname(raw);
  return host === 'googleapis.com' || !!host?.endsWith('.googleapis.com');
}

const E2E_DRIVE_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Upload-Content-Type, X-Upload-Content-Length, Content-Range',
  'Access-Control-Expose-Headers': 'Location, ETag',
};

export type GestureDriveUploadStub = {
  setBlockDriveRequests: (blocked: boolean) => void;
};

/** Persist a fresh Encore-compatible Google session so upload resume skips GIS popups. */
export async function seedGestureE2eGoogleSession(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const expiresAtMs = Date.now() + 3_600_000;
    window.localStorage.setItem(
      'encore_google_oauth_v1',
      JSON.stringify({ accessToken: 'e2e-gesture-upload-token', expiresAtMs }),
    );
    window.localStorage.setItem(
      'encore_google_identity_v1',
      JSON.stringify({
        email: 'e2e-gesture@test.example',
        displayName: 'E2E Gesture',
        rememberedAtMs: Date.now(),
      }),
    );
  });
}

/**
 * Minimal Drive API stub for resume-upload smoke — lists empty folders, accepts resumable uploads.
 * Set `setBlockDriveRequests(true)` with `context.setOffline(true)` to simulate stalled uploads.
 */
export async function stubGestureDriveUploadApi(page: Page): Promise<GestureDriveUploadStub> {
  let uploadCounter = 0;
  let blockDriveRequests = false;

  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();

    const isBlockedDriveWrite =
      url.includes('upload/drive/v3') ||
      (url.includes('e2e-mock.labs/upload/') && method === 'PUT');

    if (blockDriveRequests && isBlockedDriveWrite) {
      await route.abort('failed');
      return;
    }

    if (url.includes('oauth2/v2/userinfo')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: E2E_DRIVE_CORS_HEADERS,
        body: JSON.stringify({
          email: 'e2e-gesture@test.example',
          name: 'E2E Gesture',
          given_name: 'E2E',
        }),
      });
      return;
    }

    if (isGoogleApisHost(url) && url.includes('/drive/v3/files') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: E2E_DRIVE_CORS_HEADERS,
        body: JSON.stringify({ files: [], incompleteSearch: false }),
      });
      return;
    }

    if (url.includes('upload/drive/v3/files') && method === 'POST') {
      uploadCounter += 1;
      const sessionId = `e2e-upload-session-${uploadCounter}`;
      await route.fulfill({
        status: 200,
        headers: {
          ...E2E_DRIVE_CORS_HEADERS,
          Location: `https://e2e-mock.labs/upload/${sessionId}`,
        },
        body: '',
      });
      return;
    }

    if (url.includes('e2e-mock.labs/upload/') && method === 'PUT') {
      const fileId = `e2e-uploaded-file-${uploadCounter}`;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: E2E_DRIVE_CORS_HEADERS,
        body: JSON.stringify({ id: fileId, name: 'photo.jpg', mimeType: 'image/jpeg' }),
      });
      return;
    }

    if (
      isGoogleApisHost(url) &&
      url.includes('/drive/v3/files') &&
      !url.includes('upload/drive') &&
      method === 'POST'
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: E2E_DRIVE_CORS_HEADERS,
        body: JSON.stringify({
          id: `e2e-drive-folder-${uploadCounter}`,
          name: 'folder',
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });
      return;
    }

    if (isGoogleApisHost(url) && url.includes('/drive/') && !url.includes('upload/drive')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: E2E_DRIVE_CORS_HEADERS,
        body: JSON.stringify({ files: [] }),
      });
      return;
    }

    await route.continue();
  });

  return {
    setBlockDriveRequests(blocked: boolean) {
      blockDriveRequests = blocked;
    },
  };
}

export { E2E_GOOGLE_TOKEN };
