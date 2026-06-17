import { getTombstonedFileIds } from '../drive/gestureDriveTombstones';
import type { GesturePackFile, GestureSyncPayload } from '../types';
import { gestureDb } from './gestureDb';
import { notifyGestureLocalChange } from './gestureChangeBus';

export async function readGestureLocalPayload(): Promise<GestureSyncPayload> {
  return gestureDb.transaction('r', [gestureDb.packs, gestureDb.packFiles, gestureDb.drawHistory], async () => {
    const [packs, packFiles, drawHistory] = await Promise.all([
      gestureDb.packs.toArray(),
      gestureDb.packFiles.toArray(),
      gestureDb.drawHistory.toArray(),
    ]);
    return { packs, packFiles, drawHistory };
  });
}

/** Keep local rows when a Drive merge would shrink a collection below its indexed size. */
export function supplementPackFilesFromLocalIndex(params: {
  mergedPackFiles: GesturePackFile[];
  mergedPacks: GestureSyncPayload['packs'];
  existingPackFiles: GesturePackFile[];
  existingPacks: GestureSyncPayload['packs'];
  tombstonedFileIds?: ReadonlySet<string>;
}): GesturePackFile[] {
  const tombstonedFileIds = params.tombstonedFileIds ?? new Set<string>();
  const folderByPackId = new Map(params.mergedPacks.map((pack) => [pack.id, pack.driveFolderId]));
  const mergedPackIdByFolder = new Map(params.mergedPacks.map((pack) => [pack.driveFolderId, pack.id]));
  const existingFolderByPackId = new Map(params.existingPacks.map((pack) => [pack.id, pack.driveFolderId]));

  const packFiles = params.mergedPackFiles.filter((file) => folderByPackId.has(file.packId));
  const mergedIds = new Set(packFiles.map((file) => file.driveFileId));
  const mergedCountByFolder = new Map<string, number>();

  for (const file of packFiles) {
    const folderId = folderByPackId.get(file.packId);
    if (!folderId) continue;
    mergedCountByFolder.set(folderId, (mergedCountByFolder.get(folderId) ?? 0) + 1);
  }

  const existingByFolder = new Map<string, GesturePackFile[]>();
  for (const file of params.existingPackFiles) {
    if (tombstonedFileIds.has(file.driveFileId)) continue;
    const folderId = existingFolderByPackId.get(file.packId);
    if (!folderId || !mergedPackIdByFolder.has(folderId)) continue;
    const rows = existingByFolder.get(folderId) ?? [];
    rows.push(file);
    existingByFolder.set(folderId, rows);
  }

  for (const [folderId, mergedPackId] of mergedPackIdByFolder) {
    const existingForFolder = existingByFolder.get(folderId) ?? [];
    const mergedCount = mergedCountByFolder.get(folderId) ?? 0;
    if (existingForFolder.length <= mergedCount) continue;
    for (const file of existingForFolder) {
      if (mergedIds.has(file.driveFileId)) continue;
      packFiles.push({ ...file, packId: mergedPackId });
      mergedIds.add(file.driveFileId);
    }
  }

  return packFiles;
}

export async function applyGestureMergedPayload(payload: GestureSyncPayload): Promise<void> {
  const validPackIds = new Set(payload.packs.map((p) => p.id));
  const tombstonedFileIds = getTombstonedFileIds();
  const existingPacks = await gestureDb.packs.toArray();
  const existingPackFiles = await gestureDb.packFiles.toArray();
  const existingFolderByPackId = new Map(existingPacks.map((pack) => [pack.id, pack.driveFolderId]));
  const mergedPackIdByFolder = new Map(payload.packs.map((pack) => [pack.driveFolderId, pack.id]));

  let packFiles = payload.packFiles.filter((f) => validPackIds.has(f.packId));

  if (packFiles.length === 0 && payload.packs.length > 0) {
    const preserved = existingPackFiles
      .filter((file) => {
        if (tombstonedFileIds.has(file.driveFileId)) return false;
        const folderId = existingFolderByPackId.get(file.packId);
        return Boolean(folderId && mergedPackIdByFolder.has(folderId));
      })
      .map((file) => {
        const folderId = existingFolderByPackId.get(file.packId)!;
        return { ...file, packId: mergedPackIdByFolder.get(folderId)! };
      });
    if (preserved.length > 0) packFiles = preserved;
  } else if (payload.packs.length > 0) {
    packFiles = supplementPackFilesFromLocalIndex({
      mergedPackFiles: packFiles,
      mergedPacks: payload.packs,
      existingPackFiles,
      existingPacks,
      tombstonedFileIds,
    });
  }

  const countByPackId = new Map<string, number>();
  for (const file of packFiles) {
    countByPackId.set(file.packId, (countByPackId.get(file.packId) ?? 0) + 1);
  }
  const packs = payload.packs.map((pack) => {
    const indexedCount = countByPackId.get(pack.id) ?? 0;
    const photoIndexCount = Math.max(pack.photoIndexCount ?? 0, indexedCount);
    return photoIndexCount > (pack.photoIndexCount ?? 0) ? { ...pack, photoIndexCount } : pack;
  });

  await gestureDb.transaction(
    'rw',
    [
      gestureDb.packs,
      gestureDb.packFiles,
      gestureDb.drawHistory,
      gestureDb.uploadManifestFiles,
      gestureDb.uploadStagingBlobs,
      gestureDb.uploadDirectoryHandles,
    ],
    async () => {
      const orphanManifest = await gestureDb.uploadManifestFiles
        .filter((row) => !validPackIds.has(row.packId))
        .toArray();
      if (orphanManifest.length > 0) {
        await gestureDb.uploadManifestFiles.bulkDelete(orphanManifest.map((row) => row.id));
      }

      const orphanStaging = await gestureDb.uploadStagingBlobs
        .filter((row) => !validPackIds.has(row.packId))
        .toArray();
      if (orphanStaging.length > 0) {
        await gestureDb.uploadStagingBlobs.bulkDelete(orphanStaging.map((row) => row.id));
      }

      const orphanHandles = await gestureDb.uploadDirectoryHandles
        .filter((row) => !validPackIds.has(row.packId))
        .toArray();
      if (orphanHandles.length > 0) {
        await gestureDb.uploadDirectoryHandles.bulkDelete(orphanHandles.map((row) => row.packId));
      }

      await gestureDb.packs.clear();
      await gestureDb.packFiles.clear();
      await gestureDb.drawHistory.clear();
      if (payload.packs.length > 0) await gestureDb.packs.bulkPut(packs);
      if (packFiles.length > 0) await gestureDb.packFiles.bulkPut(packFiles);
      if (payload.drawHistory.length > 0) await gestureDb.drawHistory.bulkPut(payload.drawHistory);
    },
  );
  notifyGestureLocalChange();
}

export async function recordGestureDraw(params: {
  driveFileId: string;
  packId: string;
  durationMs: number;
}): Promise<void> {
  const now = new Date().toISOString();
  const existing = await gestureDb.drawHistory.get(params.driveFileId);
  if (existing) {
    await gestureDb.drawHistory.put({
      ...existing,
      lastDrawnAt: now,
      totalMs: existing.totalMs + params.durationMs,
      sessionCount: existing.sessionCount + 1,
    });
  } else {
    await gestureDb.drawHistory.put({
      driveFileId: params.driveFileId,
      packId: params.packId,
      firstDrawnAt: now,
      lastDrawnAt: now,
      totalMs: params.durationMs,
      sessionCount: 1,
    });
  }
  notifyGestureLocalChange();
}

export function gestureLocalProgressUpdatedAt(payload: GestureSyncPayload): string | undefined {
  let max = '';
  for (const row of payload.drawHistory) {
    if (row.lastDrawnAt > max) max = row.lastDrawnAt;
  }
  for (const pack of payload.packs) {
    if (pack.linkedAt > max) max = pack.linkedAt;
    if (pack.lastIndexedAt > max) max = pack.lastIndexedAt;
  }
  return max || undefined;
}
