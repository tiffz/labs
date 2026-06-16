import { gestureDb } from './gestureDb';
import { notifyGestureLocalChange } from './gestureChangeBus';
import type { GestureSyncPayload } from '../types';

export async function readGestureLocalPayload(): Promise<GestureSyncPayload> {
  const [packs, packFiles, drawHistory] = await Promise.all([
    gestureDb.packs.toArray(),
    gestureDb.packFiles.toArray(),
    gestureDb.drawHistory.toArray(),
  ]);
  return { packs, packFiles, drawHistory };
}

export async function applyGestureMergedPayload(payload: GestureSyncPayload): Promise<void> {
  const validPackIds = new Set(payload.packs.map((p) => p.id));
  let packFiles = payload.packFiles.filter((f) => validPackIds.has(f.packId));

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
      // Keep a local photo index when Drive merge did not include one (legacy backup or race).
      if (packFiles.length === 0 && payload.packs.length > 0) {
        const existing = await gestureDb.packFiles.toArray();
        const preserved = existing.filter((f) => validPackIds.has(f.packId));
        if (preserved.length > 0) packFiles = preserved;
      }

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
      if (payload.packs.length > 0) await gestureDb.packs.bulkPut(payload.packs);
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
