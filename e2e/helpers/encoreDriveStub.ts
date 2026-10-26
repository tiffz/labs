import type { Page } from '@playwright/test';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Expose-Headers': 'ETag',
};

/** Drive metadata rows the stub serves, keyed by file id (shape of `files.get`). */
export type E2eDriveFiles = Record<string, Record<string, unknown>>;

/**
 * A signed-in Drive for Encore smokes: serves `files` metadata, records `files.copy` and shortcut
 * creation, and answers Encore's startup sync with an empty, writable Drive.
 *
 * Pair with `seedZineboxE2eGoogleSession` for the stored token. Assert on what Drive was asked to
 * do, because the copy-vs-reference decision is otherwise invisible in a new row.
 */
export async function stubEncoreSignedInDrive(
  page: Page,
  files: E2eDriveFiles,
): Promise<{ copied: string[]; shortcutTargets: string[] }> {
  const copied: string[] = [];
  const shortcutTargets: string[] = [];
  await page.route(/googleapis\.com|accounts\.google\.com\/gsi/, async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });
    if (url.includes('accounts.google.com/gsi')) {
      return route.fulfill({ status: 200, contentType: 'application/javascript', headers: CORS, body: '' });
    }
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    if (url.includes('userinfo')) return json({ email: 'e2e@test.example', name: 'E2E' });

    const id = Object.keys(files).find((key) => url.includes(`/files/${key}`));
    if (id && method === 'POST' && url.includes(`/files/${id}/copy`)) {
      copied.push(id);
      return json({ id: 'e2eCopiedFileInMyDrive0000001', name: (files[id] as { name: string }).name });
    }
    if (id && method === 'GET' && !url.includes('alt=media')) return json(files[id]);
    if (method === 'POST') {
      // Uploads are multipart; only metadata-only creates (folders, shortcuts) are JSON.
      let body: { shortcutDetails?: { targetId?: string } } = {};
      try {
        body = JSON.parse(request.postData() ?? '{}');
      } catch {
        body = {};
      }
      const target = body.shortcutDetails?.targetId;
      if (target) shortcutTargets.push(target);
    }
    // Encore's signed-in startup sync: answer with an empty, writable Drive.
    if (method === 'GET' && url.includes('/files?')) return json({ files: [] });
    if (method === 'GET') return json({ error: { message: 'not found' } }, 404);
    return json({ id: `e2e-created-${Math.random().toString(36).slice(2)}` });
  });
  return { copied, shortcutTargets };
}
