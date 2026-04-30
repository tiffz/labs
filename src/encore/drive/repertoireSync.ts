import { encoreDb, getSyncMeta, patchSyncMeta } from '../db/encoreDb';
import type { EncorePerformance, EncoreSong } from '../types';
import {
  buildWireFromTables,
  defaultRepertoireExtrasRow,
  maxRepertoireClock,
  mergeRecordsByUpdatedAt,
  parseRepertoireWire,
  repertoireExtrasFromWire,
  serializeRepertoireWire,
} from './repertoireWire';
import { driveGetFileMetadata, driveGetMedia, drivePatchJsonMedia } from './driveFetch';
import { ensureEncoreDriveLayout } from './bootstrapFolders';

export type SyncConflictReason = 'local_and_remote_changed';

export interface SyncCheckResult {
  conflict: boolean;
  reason?: SyncConflictReason;
  remoteModified?: string;
  remoteEtag?: string;
}

export async function pullRepertoireFromDrive(
  accessToken: string,
  repertoireFileId: string,
  remoteEtag?: string
): Promise<void> {
  const raw = await driveGetMedia(accessToken, repertoireFileId);
  const wire = parseRepertoireWire(raw);
  const localSongs = await encoreDb.songs.toArray();
  const localPerf = await encoreDb.performances.toArray();
  const mergedSongs = mergeRecordsByUpdatedAt<EncoreSong>(localSongs, wire.songs);
  const mergedPerf = mergeRecordsByUpdatedAt<EncorePerformance>(localPerf, wire.performances);
  const extrasRow = repertoireExtrasFromWire(wire);
  await encoreDb.transaction('rw', encoreDb.songs, encoreDb.performances, encoreDb.repertoireExtras, async () => {
    await encoreDb.songs.clear();
    await encoreDb.performances.clear();
    await encoreDb.songs.bulkPut(mergedSongs);
    await encoreDb.performances.bulkPut(mergedPerf);
    await encoreDb.repertoireExtras.put(extrasRow);
  });
  const meta = await driveGetFileMetadata(accessToken, repertoireFileId);
  const songs = await encoreDb.songs.toArray();
  const performances = await encoreDb.performances.toArray();
  await patchSyncMeta({
    lastRemoteModified: meta.modifiedTime,
    lastRemoteEtag: meta.etag ?? remoteEtag,
    lastSuccessfulPullAt: new Date().toISOString(),
    lastSyncedLocalMaxUpdatedAt: maxRepertoireClock(songs, performances, extrasRow.updatedAt),
  });
}

export async function pushRepertoireToDrive(
  accessToken: string,
  repertoireFileId: string,
  ifMatch: string | undefined
): Promise<void> {
  const songs = await encoreDb.songs.toArray();
  const performances = await encoreDb.performances.toArray();
  const now = new Date().toISOString();
  const extrasRow = (await encoreDb.repertoireExtras.get('default')) ?? defaultRepertoireExtrasRow(now);
  const wire = buildWireFromTables(songs, performances, extrasRow);
  const body = serializeRepertoireWire(wire);
  const result = await drivePatchJsonMedia(accessToken, repertoireFileId, body, ifMatch);
  const meta = await driveGetFileMetadata(accessToken, repertoireFileId);
  await patchSyncMeta({
    lastRemoteModified: meta.modifiedTime ?? result.modifiedTime,
    lastRemoteEtag: meta.etag ?? result.etag,
    lastSuccessfulPushAt: new Date().toISOString(),
    lastSyncedLocalMaxUpdatedAt: maxRepertoireClock(songs, performances, extrasRow.updatedAt),
  });
}

export async function runInitialSyncIfPossible(accessToken: string): Promise<{
  ok: boolean;
  conflict?: SyncCheckResult;
  error?: string;
}> {
  try {
    const layout = await ensureEncoreDriveLayout(accessToken);
    const meta = await getSyncMeta();
    const remoteMeta = await driveGetFileMetadata(accessToken, layout.repertoireFileId);
    const remoteModified = remoteMeta.modifiedTime ?? '';

    const songs = await encoreDb.songs.toArray();
    const performances = await encoreDb.performances.toArray();
    const extras = await encoreDb.repertoireExtras.get('default');
    const localMax = maxRepertoireClock(songs, performances, extras?.updatedAt);

    const lastSynced = meta.lastSyncedLocalMaxUpdatedAt ?? '';
    const lastRemote = meta.lastRemoteModified ?? '';
    const localDirty = localMax > lastSynced;
    const remoteNewer =
      lastRemote === '' ? true : remoteModified > lastRemote;

    if (localDirty && lastRemote !== '' && remoteModified > lastRemote) {
      const check: SyncCheckResult = {
        conflict: true,
        reason: 'local_and_remote_changed',
        remoteModified,
        remoteEtag: remoteMeta.etag,
      };
      return { ok: false, conflict: check };
    }

    if (remoteNewer) {
      await pullRepertoireFromDrive(accessToken, layout.repertoireFileId, remoteMeta.etag);
    } else if (localDirty) {
      await pushRepertoireToDrive(accessToken, layout.repertoireFileId, meta.lastRemoteEtag);
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export async function resolveConflictUseRemoteThenPush(accessToken: string): Promise<void> {
  const meta = await getSyncMeta();
  if (!meta.repertoireFileId) throw new Error('Not bootstrapped');
  await pullRepertoireFromDrive(accessToken, meta.repertoireFileId);
  const m2 = await getSyncMeta();
  await pushRepertoireToDrive(accessToken, meta.repertoireFileId, m2.lastRemoteEtag);
}

export async function resolveConflictKeepLocal(accessToken: string): Promise<void> {
  const meta = await getSyncMeta();
  if (!meta.repertoireFileId) throw new Error('Not bootstrapped');
  await pushRepertoireToDrive(accessToken, meta.repertoireFileId, undefined);
}
