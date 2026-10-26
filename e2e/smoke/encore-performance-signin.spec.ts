import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';

/**
 * Signing in from inside the performance editor must not cost the draft.
 *
 * Reported: pasting a friend's Drive link while signed out showed "sign in" with no way to do it,
 * and the only sign-in button lived outside the dialog — following it meant closing the dialog
 * and losing everything typed. The notice now carries its own button.
 *
 * The second half pins the trap that button walked into: a failed sign-in from inside the app set
 * `accessDenied`, which swaps the whole shell for the access screen and unmounts the dialog.
 *
 * Whether the click opens a popup depends on the build: CI sets the session BFF URL, so a real
 * popup opens; a build with no Google config fails without one. The BFF start call is stubbed to
 * fail, so both builds take the same path: a sign-in that does not finish.
 *
 * The test used to reach the live BFF and close the popup. It hung on "Signing in…" whenever the
 * BFF answered, because the app did not then notice a closed popup. It does now (unit-tested in
 * labsGoogleSessionPort.test.ts; e2e builds have no BFF URL, so that path cannot run here), but
 * a smoke still must not depend on a production service.
 */
test.describe('Encore performance editor sign-in', () => {
  test('sign in from the video link notice keeps the dialog and the draft', async ({ page }) => {
    await enterEncoreApp(page);
    await page.goto('/encore/#/library');
    await expect(page.getByRole('heading', { name: 'Your repertoire' })).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Add song' }).first().click();
    const addSongDialog = page.getByRole('dialog', { name: 'Add song' });
    await addSongDialog.getByLabel('Title').fill('E2E Sign-in Song');
    await addSongDialog.getByLabel('Artist').fill('Labs Agent');
    await addSongDialog.getByRole('button', { name: 'Add song' }).click();
    await expect(page).toHaveURL(/#\/song\//, { timeout: 15_000 });

    await page.getByRole('button', { name: /Add performance|Log performance/ }).first().click();
    const editor = page.getByRole('dialog').filter({ has: page.getByPlaceholder('YouTube, Google Drive, or URL') });
    await expect(editor).toBeVisible({ timeout: 10_000 });

    const notes = editor.getByLabel('Notes');
    await notes.fill('Work in progress that must survive sign-in');
    await editor
      .getByPlaceholder('YouTube, Google Drive, or URL')
      .fill('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view');

    await expect(editor.getByText('Sign in to read this Drive link.')).toBeVisible({ timeout: 5_000 });
    await page.route('**/v1/oauth/google/start**', (route) =>
      route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Stubbed sign-in failure"}' }),
    );
    page.context().on('page', (popup) => void popup.close());
    await editor.getByRole('button', { name: 'Sign in with Google' }).click();

    await expect(editor.getByText(/Sign-in did not finish/)).toBeVisible({ timeout: 15_000 });
    await expect(editor).toBeVisible();
    await expect(notes).toHaveValue('Work in progress that must survive sign-in');
  });
});
