import { encoreDb, markDirtyRow } from '../db/encoreDb';
import { defaultRepertoireExtrasRow } from './repertoireWire';
import { ensureEncoreDriveLayout } from './bootstrapFolders';
import { applyEncoreDriveDuplicateDedup, type ApplyDriveDuplicateDedupResult } from './driveDuplicateDedup';
import { scanEncoreDriveDuplicateUploads, type DriveDuplicateGroup } from './driveDuplicateDetection';
import { mergeEncoreDriveContentIndex } from './encoreDriveContentIndex';
import { reorganizeAllPerformanceVideos } from './performanceShortcut';
import { reorganizeAllSongAttachments } from './songAttachmentOrganize';

export type DriveReorganizeDedupSummary = ApplyDriveDuplicateDedupResult & {
  duplicateGroups: number;
};

export type ReorganizeDriveUploadsResult = {
  performanceVideos: {
    renamed: number;
    skipped: number;
    errors: number;
    shortcutsCreated: number;
  };
  attachments: {
    renamed: number;
    moved: number;
    skipped: number;
    errors: number;
    shortcutsCreated: number;
  };
  /** Present when duplicate uploads were merged before reorganize; null when none were found. */
  dedup: DriveReorganizeDedupSummary | null;
  /** Duplicate sets from the pre-organize scan (for review UI). */
  duplicateGroupsForReview: DriveDuplicateGroup[];
};

/**
 * One-shot Drive tidy: merge duplicate uploads (same content hash), then performance video
 * names/shortcuts, plus song attachments moved into Encore folders and renamed.
 */
export async function reorganizeAllDriveUploads(accessToken: string): Promise<ReorganizeDriveUploadsResult> {
  const scan = await scanEncoreDriveDuplicateUploads(accessToken);
  let dedup: DriveReorganizeDedupSummary | null = null;
  if (scan.groups.length > 0) {
    const applied = await applyEncoreDriveDuplicateDedup(accessToken, scan.groups);
    dedup = { ...applied, duplicateGroups: scan.groups.length };
  }

  const now = new Date().toISOString();
  const extrasRow = (await encoreDb.repertoireExtras.get('default')) ?? defaultRepertoireExtrasRow(now);
  await encoreDb.repertoireExtras.put({
    ...extrasRow,
    driveContentIndex: mergeEncoreDriveContentIndex(extrasRow.driveContentIndex, scan.contentIndex),
    updatedAt: now,
  });
  await markDirtyRow('extras', 'default', 'upsert');

  await ensureEncoreDriveLayout(accessToken);
  const extras = (await encoreDb.repertoireExtras.get('default')) ?? defaultRepertoireExtrasRow(now);
  const overrides = extras.driveUploadFolderOverrides;
  const [performanceVideos, attachments] = await Promise.all([
    reorganizeAllPerformanceVideos(accessToken, overrides),
    reorganizeAllSongAttachments(accessToken, overrides),
  ]);
  return { performanceVideos, attachments, dedup, duplicateGroupsForReview: scan.groups };
}
