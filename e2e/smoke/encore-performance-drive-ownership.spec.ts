import { test, expect } from '../labsTest';
import { enterEncoreApp } from '../helpers/enterEncoreApp';
import { seedZineboxE2eGoogleSession } from '../helpers/zineboxDriveImport';
import { stubEncoreSignedInDrive, type E2eDriveFiles } from '../helpers/encoreDriveStub';
import { openNewPerformance } from '../helpers/encorePerformanceEditor';

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
const OWNED = 'e2eOwnedPerformanceVideo000001';
const FRIEND = 'e2eFriendPerformanceVideo00001';
const MY_SHORTCUT_TO_FRIEND = 'e2eMyShortcutToFriendVideo0001';

const FILES: E2eDriveFiles = {
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
      const drive = await stubEncoreSignedInDrive(page, FILES);
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
