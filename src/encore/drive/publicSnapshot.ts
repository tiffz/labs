import type {
  EncorePerformance,
  EncoreSong,
  PublicSnapshot,
  PublicSnapshotPerformance,
} from '../types';
import {
  driveCreateAnyoneReaderPermission,
  driveCreateJsonFile,
  driveFileHasAnyoneReader,
  driveListFiles,
  drivePatchJsonMedia,
} from './driveFetch';
import { fetchPublicDriveJson } from './bootstrapFolders';
import { PUBLIC_SNAPSHOT_FILE_NAME } from './constants';
import { driveFileWebUrl } from './driveWebUrls';
import { encoreDb, getSyncMeta, patchSyncMeta } from '../db/encoreDb';

function qJsonInParent(name: string, parentId: string): string {
  return `name='${name.replace(/'/g, "\\'")}' and mimeType='application/json' and '${parentId}' in parents and trashed=false`;
}

export type BuildPublicSnapshotOptions = {
  /** When true, only songs with at least one logged performance are included (and performances are limited to those songs). */
  onlyPerformedSongs?: boolean;
};

export function filterSnapshotSource(
  songs: EncoreSong[],
  performances: EncorePerformance[],
  options?: BuildPublicSnapshotOptions,
): { songs: EncoreSong[]; performances: EncorePerformance[] } {
  if (!options?.onlyPerformedSongs) return { songs, performances };
  const performedIds = new Set(performances.map((p) => p.songId));
  const songsOut = songs.filter((s) => performedIds.has(s.id));
  const allowed = new Set(songsOut.map((s) => s.id));
  const performancesOut = performances.filter((p) => allowed.has(p.songId));
  return { songs: songsOut, performances: performancesOut };
}

/**
 * Best-effort permission probe for one performance video. Returns the public viewer URL
 * when we can confirm `anyone:reader` access; otherwise undefined. A network failure or
 * permission lookup error is silently swallowed (snapshot still publishes; the link is
 * just omitted on the guest view).
 */
async function resolvePublicVideoUrl(
  accessToken: string,
  perf: EncorePerformance,
): Promise<string | undefined> {
  const ext = perf.externalVideoUrl?.trim();
  if (ext) return ext;
  // Prefer checking the original target file (the actual video). The shortcut in the
  // Performances folder is just a pointer; sharing it does not share the underlying video.
  const driveId = perf.videoTargetDriveFileId?.trim() || perf.videoShortcutDriveFileId?.trim();
  if (!driveId) return undefined;
  try {
    const isPublic = await driveFileHasAnyoneReader(accessToken, driveId);
    return isPublic ? driveFileWebUrl(driveId) : undefined;
  } catch {
    return undefined;
  }
}

export async function buildPublicSnapshot(
  accessToken: string,
  songs: EncoreSong[],
  performances: EncorePerformance[],
  ownerDisplayName?: string,
  options?: BuildPublicSnapshotOptions,
): Promise<PublicSnapshot> {
  const { songs: songsOut, performances: performancesOut } = filterSnapshotSource(songs, performances, options);
  const performanceRows: PublicSnapshotPerformance[] = await Promise.all(
    performancesOut.map(async (p) => {
      const videoOpenUrl = await resolvePublicVideoUrl(accessToken, p);
      return {
        id: p.id,
        songId: p.songId,
        date: p.date,
        venueTag: p.venueTag,
        externalVideoUrl: p.externalVideoUrl,
        notes: p.notes,
        videoOpenUrl,
      };
    }),
  );
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    ownerDisplayName: ownerDisplayName?.trim() || undefined,
    songs: songsOut.map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      albumArtUrl: s.albumArtUrl,
      spotifyTrackId: s.spotifyTrackId,
      youtubeVideoId: s.youtubeVideoId,
      performanceKey: s.performanceKey,
      tags: s.tags && s.tags.length > 0 ? s.tags : undefined,
    })),
    performances: performanceRows,
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
  const empty: PublicSnapshot = {
    version: 1,
    generatedAt: new Date().toISOString(),
    songs: [],
    performances: [],
  };
  const body = JSON.stringify(empty);
  const created = await driveCreateJsonFile(accessToken, body, PUBLIC_SNAPSHOT_FILE_NAME, [meta.rootFolderId]);
  await patchSyncMeta({ snapshotFileId: created.id });
  return created.id;
}

export interface PublishSnapshotResult {
  fileId: string;
  /** `generatedAt` written into the snapshot JSON (when this publish was created). */
  generatedAt: string;
  /** Drive `modifiedTime` on `public_snapshot.json` immediately after upload (same across devices). */
  driveModifiedTime?: string;
  /** True only when an unauthenticated guest fetch (with the configured public API key) succeeded after publish. */
  publiclyReadable: boolean;
  /** Set when the verification fetch could not run (no API key configured, or guest fetch failed). */
  warning?: string;
  /** Number of performances whose video link was included in the snapshot (i.e. confirmed public). */
  publicVideoCount: number;
  /** Number of performances whose video was private or could not be verified (link omitted). */
  privateVideoCount: number;
}

/**
 * Write the snapshot, re-grant `anyone reader` permission (idempotent), and verify
 * the file is actually reachable as a guest. The verification step matters because
 * Google Workspace policies can silently block "anyone with link" sharing on a Drive
 * even when the permission grant call succeeds.
 */
export async function publishSnapshotToDrive(
  accessToken: string,
  publishOptions?: BuildPublicSnapshotOptions,
): Promise<PublishSnapshotResult> {
  const songs = await encoreDb.songs.toArray();
  const performances = await encoreDb.performances.toArray();
  const extras = await encoreDb.repertoireExtras.get('default');
  const snap = await buildPublicSnapshot(
    accessToken,
    songs,
    performances,
    extras?.ownerDisplayName,
    publishOptions,
  );
  const body = JSON.stringify(snap);
  const fileId = await ensureSnapshotFileId(accessToken);
  const patchResult = await drivePatchJsonMedia(accessToken, fileId, body, undefined);
  await patchSyncMeta({ lastPublishedSnapshotAt: snap.generatedAt });
  const driveModifiedTime = patchResult.modifiedTime;

  const { performances: performancesForCounts } = filterSnapshotSource(songs, performances, publishOptions);
  const totalVideos = performancesForCounts.filter(
    (p) => p.externalVideoUrl?.trim() || p.videoTargetDriveFileId?.trim() || p.videoShortcutDriveFileId?.trim(),
  ).length;
  const publicVideoCount = snap.performances.filter((p) => Boolean(p.videoOpenUrl)).length;
  const privateVideoCount = Math.max(0, totalVideos - publicVideoCount);

  let permissionWarning: string | undefined;
  try {
    await driveCreateAnyoneReaderPermission(accessToken, fileId);
  } catch (e) {
    permissionWarning = e instanceof Error ? e.message : String(e);
  }

  const apiKey = (import.meta.env.VITE_GOOGLE_API_KEY as string | undefined)?.trim();
  if (!apiKey) {
    return {
      fileId,
      generatedAt: snap.generatedAt,
      driveModifiedTime,
      publiclyReadable: false,
      warning:
        permissionWarning ??
        'Public snapshot saved, but VITE_GOOGLE_API_KEY is not set on this site so guests cannot read it.',
      publicVideoCount,
      privateVideoCount,
    };
  }

  try {
    await fetchPublicDriveJson(fileId, apiKey);
    return {
      fileId,
      generatedAt: snap.generatedAt,
      driveModifiedTime,
      publiclyReadable: true,
      publicVideoCount,
      privateVideoCount,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      fileId,
      generatedAt: snap.generatedAt,
      driveModifiedTime,
      publiclyReadable: false,
      warning:
        permissionWarning ??
        `Snapshot saved, but the public read check failed (${msg}). Your Google Workspace may block link sharing, or the API key referrer rules may not include this site.`,
      publicVideoCount,
      privateVideoCount,
    };
  }
}
