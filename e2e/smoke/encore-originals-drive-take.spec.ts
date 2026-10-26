import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';
import { gotoEncoreOriginalsQueue, openSeededOriginalStage } from '../helpers/encoreOriginalsQueue';
import { seedZineboxE2eGoogleSession } from '../helpers/zineboxDriveImport';
import { stubEncoreSignedInDrive, type E2eDriveFiles } from '../helpers/encoreDriveStub';

/**
 * "Add take" → paste a Google Drive link. A file you own becomes a take where it is (plus a
 * shortcut in Encore's audio folder); a friend's file is copied into your Drive first (ADR 0029).
 */
const OWNED = 'e2eOwnedOriginalTakeFile00001';
const FRIEND = 'e2eFriendOriginalTakeFile0001';

const FILES: E2eDriveFiles = {
  [OWNED]: { id: OWNED, name: 'Bedroom demo.mov', mimeType: 'video/quicktime', ownedByMe: true },
  [FRIEND]: { id: FRIEND, name: 'Friend harmony.m4a', mimeType: 'audio/mp4', ownedByMe: false },
};

for (const { label, fileId, name, copied, shortcutTargets } of [
  { label: 'a file you own is added as a pointer', fileId: OWNED, name: 'Bedroom demo.mov', copied: [], shortcutTargets: [OWNED] },
  { label: 'a friend’s file is copied first', fileId: FRIEND, name: 'Friend harmony.m4a', copied: [FRIEND], shortcutTargets: [] },
]) {
  test(`Encore Originals Drive take: ${label}`, async ({ page }) => {
    test.setTimeout(60_000);
    await seedZineboxE2eGoogleSession(page);
    const drive = await stubEncoreSignedInDrive(page, FILES);
    await enterEncoreApp(page);
    await gotoEncoreOriginalsQueue(page);
    await openSeededOriginalStage(page, 'E2E Queue A', 'Record takes');

    const takes = page.getByRole('region', { name: 'Demo takes' });
    await takes.getByRole('button', { name: 'Add take' }).click();
    const field = page.getByPlaceholder('Paste link');
    await field.fill(`https://drive.google.com/file/d/${fileId}/view`);
    await field.press('Enter');

    // The row shows the name, sometimes without its extension.
    const names = takes.getByRole('textbox', { name: 'Take name' });
    await expect(names).toHaveCount(2, { timeout: 15_000 });
    await expect(names.last()).toHaveValue(new RegExp(`^${name.replace(/\.[^.]+$/, '')}`));
    await expect(page.getByPlaceholder('Paste link')).toBeHidden();
    expect(drive.copied).toEqual(copied);
    expect(drive.shortcutTargets).toEqual(shortcutTargets);
  });
}
