import type { EncoreDriveUploadFolderOverrides, EncorePerformance, EncoreSong } from '../types';
import { driveCreateShortcut, driveGetFileMetadata, driveMoveFile, driveRenameFile } from './driveFetch';
import { encoreDb, getSyncMeta } from '../db/encoreDb';
import { buildPerformanceVideoName, splitFileNameExtension } from './performanceVideoNaming';
import { resolveDriveUploadFolderId } from './resolveDriveUploadFolder';

const SHORTCUT_MIME = 'application/vnd.google-apps.shortcut';

export async function createPerformanceVideoShortcut(
  accessToken: string,
  targetDriveFileId: string,
  shortcutName: string,
  shortcutParentFolderId?: string,
): Promise<string> {
  const meta = await getSyncMeta();
  const parent = shortcutParentFolderId?.trim() || meta.performancesFolderId;
  if (!parent) {
    throw new Error('Performances folder missing; sync Drive first.');
  }
  const created = await driveCreateShortcut(accessToken, shortcutName, parent, targetDriveFileId);
  return created.id;
}

/**
 * Outcome of `syncPerformanceVideo` describing what changed in Drive.
 *
 * - `shortcutCreatedId` – the new shortcut file id, if one was just created
 * - `renamed` – whether at least one file was renamed to match the canonical convention
 */
export interface PerformanceVideoSyncResult {
  shortcutCreatedId?: string;
  renamed: boolean;
}

/**
 * Reconcile the Drive footprint of a performance video:
 *
 * - When upload-folder overrides move the effective performances folder, Encore-managed files
 *   still sitting under `Encore_App/Performances` are **moved** into that folder; a shortcut remains
 *   in the Encore folder when the video no longer lives there.
 * - If `videoTargetDriveFileId` is set and the target lives **outside** the Encore_App Performances
 *   folder (Drive-picked file), ensure a shortcut to it exists there.
 * - Rename the shortcut (or in-folder upload) to `YYYY-MM-DD - Title - Artist` (venue is not in the filename;
 *   use Drive folder names during bulk import). Drive stays organized as metadata evolves.
 *
 * Safe to call repeatedly; no-op when nothing needs to change.
 */
export async function syncPerformanceVideo(
  accessToken: string,
  performance: EncorePerformance,
  song: EncoreSong | null,
  driveUploadFolderOverrides?: EncoreDriveUploadFolderOverrides | null,
): Promise<PerformanceVideoSyncResult> {
  const meta = await getSyncMeta();
  const bootstrapPerf = meta.performancesFolderId?.trim();
  if (!bootstrapPerf) return { renamed: false };

  const effectivePerf =
    resolveDriveUploadFolderId('performances', meta, driveUploadFolderOverrides ?? undefined)?.trim() ||
    bootstrapPerf;

  let renamed = false;
  let shortcutCreatedId: string | undefined;

  const shortcutIdFromState = performance.videoShortcutDriveFileId?.trim();
  const targetId = performance.videoTargetDriveFileId?.trim();

  let targetMeta: Awaited<ReturnType<typeof driveGetFileMetadata>> | null = null;
  if (targetId) {
    try {
      targetMeta = await driveGetFileMetadata(accessToken, targetId);
    } catch {
      /* target may no longer be reachable; we'll skip shortcut work below */
    }
  }

  if (targetId && targetMeta && targetMeta.mimeType !== SHORTCUT_MIME) {
    const parents = targetMeta.parents ?? [];
    const shouldMoveToEffective =
      effectivePerf !== bootstrapPerf &&
      parents.includes(bootstrapPerf) &&
      !parents.includes(effectivePerf);
    if (shouldMoveToEffective) {
      try {
        await driveMoveFile(accessToken, targetId, effectivePerf, parents);
        targetMeta = await driveGetFileMetadata(accessToken, targetId);
      } catch {
        /* leave file location if move fails */
      }
    }
  }

  const targetParents = targetMeta?.parents ?? [];
  const targetInBootstrap =
    Boolean(targetId && targetMeta && targetMeta.mimeType !== SHORTCUT_MIME && targetParents.includes(bootstrapPerf));

  if (!shortcutIdFromState && targetId && targetMeta && targetMeta.mimeType !== SHORTCUT_MIME && !targetInBootstrap) {
    try {
      const desired = buildPerformanceVideoName(performance, song, '');
      shortcutCreatedId = await createPerformanceVideoShortcut(accessToken, targetId, desired, bootstrapPerf);
    } catch {
      /* shortcut creation is best-effort */
    }
  }

  const shortcutId = shortcutIdFromState ?? shortcutCreatedId;
  if (shortcutId) {
    try {
      const m = await driveGetFileMetadata(accessToken, shortcutId);
      const livesInBootstrap = (m.parents ?? []).includes(bootstrapPerf);
      if (livesInBootstrap) {
        const desired = buildPerformanceVideoName(performance, song, '');
        if ((m.name ?? '') !== desired) {
          await driveRenameFile(accessToken, shortcutId, desired);
          renamed = true;
        }
      }
    } catch {
      /* shortcut may have been deleted by user; skip */
    }
  }

  if (targetId && targetMeta && targetMeta.mimeType !== SHORTCUT_MIME) {
    const tp = targetMeta.parents ?? [];
    const targetInEffective = tp.includes(effectivePerf);
    if (targetInEffective && targetId !== shortcutId) {
      const { extension } = splitFileNameExtension(targetMeta.name ?? '');
      const desired = buildPerformanceVideoName(performance, song, extension);
      if ((targetMeta.name ?? '') !== desired) {
        try {
          await driveRenameFile(accessToken, targetId, desired);
          renamed = true;
        } catch {
          /* leave the file alone if rename fails */
        }
      }
    }
  }

  return { shortcutCreatedId, renamed };
}

/** Backwards-compatible alias kept for callers that only need the renamed signal. */
export async function syncPerformanceVideoFileName(
  accessToken: string,
  performance: EncorePerformance,
  song: EncoreSong | null,
  driveUploadFolderOverrides?: EncoreDriveUploadFolderOverrides | null,
): Promise<boolean> {
  const r = await syncPerformanceVideo(accessToken, performance, song, driveUploadFolderOverrides);
  return r.renamed;
}

/**
 * Re-name every performance video Encore manages to match the current naming convention,
 * AND create any missing shortcuts. Useful as a one-shot "Reorganize my performance videos"
 * action when the user updates many songs at once or wants to migrate older entries.
 */
export async function reorganizeAllPerformanceVideos(
  accessToken: string,
  driveUploadFolderOverrides?: EncoreDriveUploadFolderOverrides | null,
): Promise<{
  renamed: number;
  skipped: number;
  errors: number;
  shortcutsCreated: number;
}> {
  const performances = await encoreDb.performances.toArray();
  const songs = await encoreDb.songs.toArray();
  const songsById = new Map(songs.map((s) => [s.id, s] as const));
  let renamed = 0;
  let skipped = 0;
  let errors = 0;
  let shortcutsCreated = 0;

  for (const p of performances) {
    if (!p.videoShortcutDriveFileId && !p.videoTargetDriveFileId) {
      skipped += 1;
      continue;
    }
    try {
      const result = await syncPerformanceVideo(
        accessToken,
        p,
        songsById.get(p.songId) ?? null,
        driveUploadFolderOverrides,
      );
      if (result.shortcutCreatedId) {
        shortcutsCreated += 1;
        await encoreDb.performances.put({
          ...p,
          videoShortcutDriveFileId: result.shortcutCreatedId,
          updatedAt: new Date().toISOString(),
        });
      }
      if (result.renamed) renamed += 1;
      else if (!result.shortcutCreatedId) skipped += 1;
    } catch {
      errors += 1;
    }
  }

  return { renamed, skipped, errors, shortcutsCreated };
}
