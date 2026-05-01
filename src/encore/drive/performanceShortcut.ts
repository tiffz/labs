import type { EncorePerformance, EncoreSong } from '../types';
import { driveCreateShortcut, driveGetFileMetadata, driveRenameFile } from './driveFetch';
import { encoreDb, getSyncMeta } from '../db/encoreDb';
import { buildPerformanceVideoName, splitFileNameExtension } from './performanceVideoNaming';

export async function createPerformanceVideoShortcut(
  accessToken: string,
  targetDriveFileId: string,
  shortcutName: string,
): Promise<string> {
  const meta = await getSyncMeta();
  if (!meta.performancesFolderId) {
    throw new Error('Performances folder missing; sync Drive first.');
  }
  const created = await driveCreateShortcut(accessToken, shortcutName, meta.performancesFolderId, targetDriveFileId);
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
 * - If `videoTargetDriveFileId` is set and the target lives **outside** the Performances
 *   folder (Drive-picked file), ensure a shortcut to it exists in `Encore_App/Performances`.
 * - If the target lives **inside** the Performances folder (uploaded directly), no
 *   shortcut is needed; we leave the file as-is.
 * - Rename the shortcut (or in-folder upload) to `YYYY-MM-DD - Title - Artist` (venue is not in the filename;
 *   use Drive folder names during bulk import). Drive stays organized as metadata evolves.
 *
 * Safe to call repeatedly; no-op when nothing needs to change.
 */
export async function syncPerformanceVideo(
  accessToken: string,
  performance: EncorePerformance,
  song: EncoreSong | null,
): Promise<PerformanceVideoSyncResult> {
  const meta = await getSyncMeta();
  if (!meta.performancesFolderId) return { renamed: false };

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
  const targetParents = targetMeta?.parents ?? [];
  const targetInPerformancesFolder = targetParents.includes(meta.performancesFolderId);

  // Create a missing shortcut for picked-from-Drive videos that live elsewhere.
  if (!shortcutIdFromState && targetId && targetMeta && !targetInPerformancesFolder) {
    try {
      const desired = buildPerformanceVideoName(performance, song, '');
      shortcutCreatedId = (await createPerformanceVideoShortcut(accessToken, targetId, desired));
    } catch {
      /* shortcut creation is best-effort */
    }
  }

  // Rename the shortcut (existing or newly created) to match the canonical name.
  const shortcutId = shortcutIdFromState ?? shortcutCreatedId;
  if (shortcutId) {
    try {
      const m = await driveGetFileMetadata(accessToken, shortcutId);
      const livesInPerformancesFolder = (m.parents ?? []).includes(meta.performancesFolderId);
      if (livesInPerformancesFolder) {
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

  // Rename the actual file if Encore owns it (uploaded directly into the Performances folder).
  if (targetId && targetMeta && targetInPerformancesFolder && targetId !== shortcutId) {
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

  return { shortcutCreatedId, renamed };
}

/** Backwards-compatible alias kept for callers that only need the renamed signal. */
export async function syncPerformanceVideoFileName(
  accessToken: string,
  performance: EncorePerformance,
  song: EncoreSong | null,
): Promise<boolean> {
  const r = await syncPerformanceVideo(accessToken, performance, song);
  return r.renamed;
}

/**
 * Re-name every performance video Encore manages to match the current naming convention,
 * AND create any missing shortcuts. Useful as a one-shot "Reorganize my performance videos"
 * action when the user updates many songs at once or wants to migrate older entries.
 */
export async function reorganizeAllPerformanceVideos(accessToken: string): Promise<{
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
      const result = await syncPerformanceVideo(accessToken, p, songsById.get(p.songId) ?? null);
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
