import { test, expect, type Page } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';
import { seedZineboxE2eGoogleSession } from '../helpers/zineboxDriveImport';

/**
 * Pasting a Drive link into the performance editor: a file you own is referenced, a file someone
 * else owns is copied when you save. The test asserts the outcome Drive sees (a `files.copy` call,
 * or none), because a new performance shows no "Save a copy" box: that box is drawn only when
 * editing a saved performance, and the copy runs at save either way.
 *
 * The shortcut case is the one that shipped wrong: a shortcut YOU made to a FRIEND's file reports
 * `ownedByMe: true` on the shortcut row. The editor trusted the row and stored a pointer at the
 * friend's file. Ownership must come from the shortcut's target.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Expose-Headers': 'ETag',
};

const OWNED = 'e2eOwnedPerformanceVideo000001';
const FRIEND = 'e2eFriendPerformanceVideo00001';
const MY_SHORTCUT_TO_FRIEND = 'e2eMyShortcutToFriendVideo0001';

const FILES: Record<string, Record<string, unknown>> = {
  [OWNED]: {
    id: OWNED,
    name: 'My gig.mov',
    mimeType: 'video/quicktime',
    ownedByMe: true,
  },
  [FRIEND]: {
    id: FRIEND,
    name: 'Friend gig.mov',
    mimeType: 'video/quicktime',
    ownedByMe: false,
  },
  [MY_SHORTCUT_TO_FRIEND]: {
    id: MY_SHORTCUT_TO_FRIEND,
    name: 'Shortcut to Friend gig',
    mimeType: 'application/vnd.google-apps.shortcut',
    ownedByMe: true,
    shortcutDetails: { targetId: FRIEND, targetMimeType: 'video/quicktime' },
  },
};

async function stubDrive(page: Page): Promise<{ copied: string[] }> {
  const copied: string[] = [];
  await page.route(
    /googleapis\.com|accounts\.google\.com\/gsi/,
    async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      const json = (body: unknown, status = 200) =>
        route.fulfill({
          status,
          contentType: 'application/json',
          headers: CORS,
          body: JSON.stringify(body),
        });
      if (url.includes('accounts.google.com/gsi')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          headers: CORS,
          body: '',
        });
      }
      if (method === 'OPTIONS')
        return route.fulfill({ status: 204, headers: CORS });
      if (url.includes('userinfo'))
        return json({ email: 'e2e@test.example', name: 'E2E' });
      const id = Object.keys(FILES).find((key) =>
        url.includes(`/files/${key}`)
      );
      if (id && method === 'POST' && url.includes(`/files/${id}/copy`)) {
        copied.push(id);
        return json({
          id: 'e2eCopiedVideoInMyDrive000001',
          name: (FILES[id] as { name: string }).name,
        });
      }
      if (id && method === 'GET' && !url.includes('alt=media'))
        return json(FILES[id]);
      // Encore's signed-in startup sync: answer with an empty, writable Drive.
      if (method === 'GET' && url.includes('/files?'))
        return json({ files: [] });
      if (method === 'GET')
        return json({ error: { message: 'not found' } }, 404);
      return json({ id: `e2e-created-${Math.random().toString(36).slice(2)}` });
    }
  );
  return { copied };
}

async function openNewPerformance(page: Page) {
  await page.goto('/encore/#/library');
  // Signed in, the heading names the account ("E2E's repertoire").
  await expect(page.getByRole('heading', { name: /repertoire$/i })).toBeVisible(
    { timeout: 15_000 }
  );
  await page.getByRole('button', { name: 'Add song' }).first().click();
  const addSong = page.getByRole('dialog', { name: 'Add song' });
  await addSong.getByLabel('Title').fill('E2E Ownership Song');
  await addSong.getByLabel('Artist').fill('Labs Agent');
  await addSong.getByRole('button', { name: 'Add song' }).click();
  await expect(page).toHaveURL(/#\/song\//, { timeout: 15_000 });
  await page
    .getByRole('button', { name: /Add performance|Log performance/ })
    .first()
    .click();
  const editor = page
    .getByRole('dialog')
    .filter({ has: page.getByPlaceholder('YouTube, Google Drive, or URL') });
  await expect(editor).toBeVisible({ timeout: 10_000 });
  return editor;
}

test.describe('Encore performance editor Drive ownership', () => {
  for (const { label, fileId, copiedFrom } of [
    {
      label: 'a file you own is referenced, not copied',
      fileId: OWNED,
      copiedFrom: [],
    },
    {
      label: 'a friend’s file is copied',
      fileId: FRIEND,
      copiedFrom: [FRIEND],
    },
    // The copy is taken from the TARGET; copying the shortcut row would copy a pointer.
    {
      label: 'your shortcut to a friend’s file is copied',
      fileId: MY_SHORTCUT_TO_FRIEND,
      copiedFrom: [FRIEND],
    },
  ]) {
    test(label, async ({ page }) => {
      // Add a song, open the editor, paste, save: the step waits alone exceed the 30s default, and
      // a cold dev-server compile pushed the first run past it (2 of 6 failed, then 30 green).
      test.setTimeout(60_000);
      await seedZineboxE2eGoogleSession(page);
      const drive = await stubDrive(page);
      await enterEncoreApp(page);
      const editor = await openNewPerformance(page);
      await editor
        .getByPlaceholder('YouTube, Google Drive, or URL')
        .fill(`https://drive.google.com/file/d/${fileId}/view`);
      // Wait for the lookup to finish (the file's name appears) before saving.
      await expect(editor.getByText(/gig/).first()).toBeVisible({
        timeout: 10_000,
      });
      await editor.getByRole('button', { name: 'Save' }).click();
      await expect(editor).toBeHidden({ timeout: 15_000 });
      expect(drive.copied).toEqual(copiedFrom);
    });
  }
});
