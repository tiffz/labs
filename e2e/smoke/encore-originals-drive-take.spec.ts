import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';
import { gotoEncoreOriginalsQueue } from '../helpers/encoreOriginalsQueue';
import { seedZineboxE2eGoogleSession } from '../helpers/zineboxDriveImport';
import { stubEncoreSignedInDrive, type E2eDriveFiles } from '../helpers/encoreDriveStub';

/**
 * "Add take" → paste a Google Drive link → review → confirm. A file you own becomes a take where it
 * is (plus a shortcut in Encore's audio folder); a friend's file is copied into your Drive first
 * (ADR 0029). Pasting only stages: Drive sees no write until the user confirms (ADR 0030).
 */
const OWNED = 'e2eOwnedOriginalTakeFile00001';
const FRIEND = 'e2eFriendOriginalTakeFile0001';

const FILES: E2eDriveFiles = {
  [OWNED]: { id: OWNED, name: 'Bedroom demo.mov', mimeType: 'video/quicktime', ownedByMe: true },
  [FRIEND]: { id: FRIEND, name: 'Friend harmony.m4a', mimeType: 'audio/mp4', ownedByMe: false },
};

for (const { label, fileId, name, outcome, copied, shortcutTargets } of [
  { label: 'a file you own is added as a pointer', fileId: OWNED, name: 'Bedroom demo.mov', outcome: 'Links to your file in Drive', copied: [], shortcutTargets: [OWNED] },
  { label: 'a friend’s file is copied first', fileId: FRIEND, name: 'Friend harmony.m4a', outcome: 'Copies into your Drive', copied: [FRIEND], shortcutTargets: [] },
]) {
  test(`Encore Originals Drive take: ${label}`, async ({ page }) => {
    test.setTimeout(60_000);
    await seedZineboxE2eGoogleSession(page);
    const drive = await stubEncoreSignedInDrive(page, FILES);
    await enterEncoreApp(page);
    await gotoEncoreOriginalsQueue(page);
    await page.getByText('E2E Queue A', { exact: true }).click();
    await page.getByRole('button', { name: 'Record takes' }).click();

    const takes = page.getByRole('region', { name: 'Demo takes' });
    await takes.getByRole('button', { name: 'Add take' }).click();
    const field = page.getByPlaceholder('Paste link');
    await field.fill(`https://drive.google.com/file/d/${fileId}/view`);
    await field.press('Enter');

    // Staged, not added: the review row says what will happen, and Drive has seen no write yet.
    const review = page.getByRole('region', { name: 'Takes ready to add' });
    await expect(review.getByText(name)).toBeVisible({ timeout: 15_000 });
    await expect(review.getByText(outcome)).toBeVisible();
    await expect(takes.getByRole('textbox', { name: 'Take name' })).toHaveCount(1);
    expect(drive.copied).toEqual([]);
    expect(drive.shortcutTargets).toEqual([]);

    await review.getByRole('button', { name: 'Add take' }).click();
    await expect(review).toBeHidden({ timeout: 15_000 });

    // The row shows the name, sometimes without its extension.
    const names = takes.getByRole('textbox', { name: 'Take name' });
    await expect(names).toHaveCount(2, { timeout: 15_000 });
    await expect(names.last()).toHaveValue(new RegExp(`^${name.replace(/\.[^.]+$/, '')}`));
    await expect(page.getByPlaceholder('Paste link')).toBeHidden();
    expect(drive.copied).toEqual(copied);
    expect(drive.shortcutTargets).toEqual(shortcutTargets);
  });
}
