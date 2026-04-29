import type { EncorePerformance, EncoreSong, PublicSnapshot } from '../types';
import { driveCreateAnyoneReaderPermission, driveCreateJsonFile, driveListFiles, drivePatchJsonMedia } from './driveFetch';
import { PUBLIC_SNAPSHOT_FILE_NAME } from './constants';
import { encoreDb, getSyncMeta, patchSyncMeta } from '../db/encoreDb';

function qJsonInParent(name: string, parentId: string): string {
  return `name='${name.replace(/'/g, "\\'")}' and mimeType='application/json' and '${parentId}' in parents and trashed=false`;
}

export function buildPublicSnapshot(songs: EncoreSong[], performances: EncorePerformance[]): PublicSnapshot {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    songs: songs.map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      albumArtUrl: s.albumArtUrl,
      spotifyTrackId: s.spotifyTrackId,
      youtubeVideoId: s.youtubeVideoId,
      originalKey: s.originalKey,
      originalBpm: s.originalBpm,
      performanceKey: s.performanceKey,
      performanceBpm: s.performanceBpm,
    })),
    performances: performances.map((p) => ({
      id: p.id,
      songId: p.songId,
      date: p.date,
      venueTag: p.venueTag,
      externalVideoUrl: p.externalVideoUrl,
      notes: p.notes,
    })),
  };
}

export async function ensureSnapshotFileId(accessToken: string): Promise<string> {
  const meta = await getSyncMeta();
  if (meta.snapshotFileId) return meta.snapshotFileId;
  if (!meta.rootFolderId) throw new Error('Drive not bootstrapped');
  const list = await driveListFiles(accessToken, qJsonInParent(PUBLIC_SNAPSHOT_FILE_NAME, meta.rootFolderId));
  const existing = (list.files?.[0] as { id?: string } | undefined)?.id;
  if (existing) {
    await patchSyncMeta({ snapshotFileId: existing });
    return existing;
  }
  const snap = buildPublicSnapshot([], []);
  const body = JSON.stringify(snap);
  const created = await driveCreateJsonFile(accessToken, body, PUBLIC_SNAPSHOT_FILE_NAME, [meta.rootFolderId]);
  await patchSyncMeta({ snapshotFileId: created.id });
  return created.id;
}

export async function publishSnapshotToDrive(accessToken: string): Promise<{ fileId: string }> {
  const songs = await encoreDb.songs.toArray();
  const performances = await encoreDb.performances.toArray();
  const snap = buildPublicSnapshot(songs, performances);
  const body = JSON.stringify(snap);
  const fileId = await ensureSnapshotFileId(accessToken);
  await drivePatchJsonMedia(accessToken, fileId, body, undefined);
  try {
    await driveCreateAnyoneReaderPermission(accessToken, fileId);
  } catch {
    /* permission may already exist */
  }
  return { fileId };
}
