import { encoreDb, getSyncMeta, patchSyncMeta, type SyncMetaRow } from '../db/encoreDb';
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
  /** Drive `repertoire_data.json` modifiedTime when the conflict was detected (RFC 3339 from Google). */
  remoteModified?: string;
  remoteEtag?: string;
  /**
   * Max `updatedAt` across songs, performances, and repertoire extras on this device.
   * When newer than {@link SyncCheckResult.lastSyncedLocalMaxUpdatedAt}, the local library has unsynced edits.
   */
  localMaxUpdatedAt?: string;
  /** Last local "clock" Encore treated as fully in sync with Drive (from sync meta). */
  lastSyncedLocalMaxUpdatedAt?: string;
  /** Last Drive `modifiedTime` Encore merged from (from sync meta). Remote is newer than this when the conflict fired. */
  lastKnownRemoteModified?: string;
}

export type ConflictRowKind = 'song' | 'performance';

/** A single row that differs between local and remote (used by the new conflict review UX). */
export interface ConflictRowSummary {
  id: string;
  kind: ConflictRowKind;
  /** Headline label (song title, or "Performance: <song> · <date>" for performances). */
  label: string;
  sublabel?: string;
  localUpdatedAt?: string;
  remoteUpdatedAt?: string;
}

/**
 * Row-level conflict diff between local and remote repertoire snapshots.
 *
 * - `localOnly`: rows the user edited on this device since the last successful sync, but Drive
 *   did not change for. Auto-merging keeps these (newer-wins).
 * - `remoteOnly`: rows Drive picked up since last sync that this device hasn't touched. Auto-merging
 *   accepts them.
 * - `bothEdited`: rows both sides edited since the divergence point. These need the user's call.
 */
export interface ConflictAnalysis {
  localOnly: ConflictRowSummary[];
  remoteOnly: ConflictRowSummary[];
  bothEdited: ConflictRowSummary[];
}

/** Lets the main thread paint between heavy steps (Drive sync). */
async function yieldToMain(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export type RepertoireSyncProgress = (p: number | null) => void;

export type PullRepertoireOptions = {
  /** Optional 0–1 progress within the pull operation (for determinate UI). */
  onProgress?: RepertoireSyncProgress;
};

export type PushRepertoireOptions = {
  onProgress?: RepertoireSyncProgress;
};

export type RunInitialSyncOptions = {
  onProgress?: RepertoireSyncProgress;
};

export async function pullRepertoireFromDrive(
  accessToken: string,
  repertoireFileId: string,
  remoteEtag?: string,
  opts?: PullRepertoireOptions,
): Promise<void> {
  const onProgress = opts?.onProgress;
  onProgress?.(0.05);
  const raw = await driveGetMedia(accessToken, repertoireFileId);
  onProgress?.(0.22);
  const wire = parseRepertoireWire(raw);
  onProgress?.(0.32);
  const localSongs = await encoreDb.songs.toArray();
  const localPerf = await encoreDb.performances.toArray();
  const mergedSongs = mergeRecordsByUpdatedAt<EncoreSong>(localSongs, wire.songs);
  const mergedPerf = mergeRecordsByUpdatedAt<EncorePerformance>(localPerf, wire.performances);
  const extrasRow = repertoireExtrasFromWire(wire);
  onProgress?.(0.48);
  await yieldToMain();
  await encoreDb.transaction('rw', encoreDb.songs, encoreDb.performances, encoreDb.repertoireExtras, async () => {
    await encoreDb.songs.clear();
    await encoreDb.performances.clear();
    await encoreDb.songs.bulkPut(mergedSongs);
    await encoreDb.performances.bulkPut(mergedPerf);
    await encoreDb.repertoireExtras.put(extrasRow);
  });
  onProgress?.(0.72);
  const meta = await driveGetFileMetadata(accessToken, repertoireFileId);
  const localMax = maxRepertoireClock(mergedSongs, mergedPerf, extrasRow.updatedAt);
  await patchSyncMeta({
    lastRemoteModified: meta.modifiedTime,
    lastRemoteEtag: meta.etag ?? remoteEtag,
    lastSuccessfulPullAt: new Date().toISOString(),
    lastSyncedLocalMaxUpdatedAt: localMax,
  });
  onProgress?.(1);
}

export async function pushRepertoireToDrive(
  accessToken: string,
  repertoireFileId: string,
  ifMatch: string | undefined,
  opts?: PushRepertoireOptions,
): Promise<void> {
  const onProgress = opts?.onProgress;
  onProgress?.(0.12);
  const songs = await encoreDb.songs.toArray();
  const performances = await encoreDb.performances.toArray();
  const now = new Date().toISOString();
  const extrasRow = (await encoreDb.repertoireExtras.get('default')) ?? defaultRepertoireExtrasRow(now);
  onProgress?.(0.28);
  await yieldToMain();
  const wire = buildWireFromTables(songs, performances, extrasRow);
  const body = serializeRepertoireWire(wire);
  onProgress?.(0.52);
  const result = await drivePatchJsonMedia(accessToken, repertoireFileId, body, ifMatch);
  onProgress?.(0.78);
  const meta = await driveGetFileMetadata(accessToken, repertoireFileId);
  await patchSyncMeta({
    lastRemoteModified: meta.modifiedTime ?? result.modifiedTime,
    lastRemoteEtag: meta.etag ?? result.etag,
    lastSuccessfulPushAt: new Date().toISOString(),
    lastSyncedLocalMaxUpdatedAt: maxRepertoireClock(songs, performances, extrasRow.updatedAt),
  });
  onProgress?.(1);
}

interface RowWithMeta {
  id: string;
  updatedAt: string;
}

function songSummary(
  s: EncoreSong | undefined,
  remote: EncoreSong | undefined,
): ConflictRowSummary {
  const ref = s ?? remote;
  if (!ref) throw new Error('songSummary called with no row');
  const title = ref.title?.trim() || 'Untitled song';
  const artist = ref.artist?.trim();
  return {
    id: ref.id,
    kind: 'song',
    label: title,
    sublabel: artist || undefined,
    localUpdatedAt: s?.updatedAt,
    remoteUpdatedAt: remote?.updatedAt,
  };
}

function perfSummary(
  songsById: Map<string, EncoreSong>,
  remoteSongsById: Map<string, EncoreSong>,
  p: EncorePerformance | undefined,
  remote: EncorePerformance | undefined,
): ConflictRowSummary {
  const ref = p ?? remote;
  if (!ref) throw new Error('perfSummary called with no row');
  const song = songsById.get(ref.songId) ?? remoteSongsById.get(ref.songId);
  const songTitle = song?.title?.trim() || 'Performance';
  const venue = ref.venueTag?.trim();
  return {
    id: ref.id,
    kind: 'performance',
    label: `${songTitle} · ${ref.date || ''}`.trim(),
    sublabel: venue || undefined,
    localUpdatedAt: p?.updatedAt,
    remoteUpdatedAt: remote?.updatedAt,
  };
}

function classifyRow(
  local: RowWithMeta | undefined,
  remote: RowWithMeta | undefined,
  lastSynced: string,
  lastRemote: string,
): 'inSync' | 'localOnly' | 'remoteOnly' | 'bothEdited' {
  if (!local && !remote) return 'inSync';
  if (local && !remote) return local.updatedAt > lastSynced ? 'localOnly' : 'inSync';
  if (!local && remote) return remote.updatedAt > lastRemote ? 'remoteOnly' : 'inSync';
  // both present
  if (local!.updatedAt === remote!.updatedAt) return 'inSync';
  const localChanged = local!.updatedAt > lastSynced;
  const remoteChanged = remote!.updatedAt > lastRemote;
  if (localChanged && remoteChanged) return 'bothEdited';
  if (localChanged) return 'localOnly';
  if (remoteChanged) return 'remoteOnly';
  return 'inSync';
}

/**
 * Compute a row-level conflict analysis between local and remote repertoire snapshots. Used by
 * the new {@link runInitialSyncIfPossible} flow: when `bothEdited.length === 0` we silently
 * auto-merge; otherwise the conflict review dialog asks the user only about the overlapping rows.
 */
export function analyzeRepertoireConflict(
  local: { songs: EncoreSong[]; performances: EncorePerformance[] },
  remote: { songs: EncoreSong[]; performances: EncorePerformance[] },
  syncMeta: Pick<SyncMetaRow, 'lastSyncedLocalMaxUpdatedAt' | 'lastRemoteModified'>,
): ConflictAnalysis {
  const lastSynced = syncMeta.lastSyncedLocalMaxUpdatedAt ?? '';
  const lastRemote = syncMeta.lastRemoteModified ?? '';

  const localSongsById = new Map(local.songs.map((s) => [s.id, s] as const));
  const remoteSongsById = new Map(remote.songs.map((s) => [s.id, s] as const));
  const localPerfById = new Map(local.performances.map((p) => [p.id, p] as const));
  const remotePerfById = new Map(remote.performances.map((p) => [p.id, p] as const));

  const localOnly: ConflictRowSummary[] = [];
  const remoteOnly: ConflictRowSummary[] = [];
  const bothEdited: ConflictRowSummary[] = [];

  const allSongIds = new Set([...localSongsById.keys(), ...remoteSongsById.keys()]);
  for (const id of allSongIds) {
    const l = localSongsById.get(id);
    const r = remoteSongsById.get(id);
    const cls = classifyRow(l, r, lastSynced, lastRemote);
    if (cls === 'inSync') continue;
    const summary = songSummary(l, r);
    if (cls === 'localOnly') localOnly.push(summary);
    else if (cls === 'remoteOnly') remoteOnly.push(summary);
    else bothEdited.push(summary);
  }

  const allPerfIds = new Set([...localPerfById.keys(), ...remotePerfById.keys()]);
  for (const id of allPerfIds) {
    const l = localPerfById.get(id);
    const r = remotePerfById.get(id);
    const cls = classifyRow(l, r, lastSynced, lastRemote);
    if (cls === 'inSync') continue;
    const summary = perfSummary(localSongsById, remoteSongsById, l, r);
    if (cls === 'localOnly') localOnly.push(summary);
    else if (cls === 'remoteOnly') remoteOnly.push(summary);
    else bothEdited.push(summary);
  }

  return { localOnly, remoteOnly, bothEdited };
}

export async function runInitialSyncIfPossible(
  accessToken: string,
  options?: RunInitialSyncOptions,
): Promise<{
  ok: boolean;
  conflict?: SyncCheckResult;
  /** Populated alongside `conflict`: row-level diff so callers can auto-merge or show a focused dialog. */
  analysis?: ConflictAnalysis;
  error?: string;
}> {
  const onProgress = options?.onProgress;
  try {
    onProgress?.(0.06);
    const layout = await ensureEncoreDriveLayout(accessToken);
    onProgress?.(0.18);
    const meta = await getSyncMeta();
    onProgress?.(0.24);
    const remoteMeta = await driveGetFileMetadata(accessToken, layout.repertoireFileId);
    const remoteModified = remoteMeta.modifiedTime ?? '';

    const songs = await encoreDb.songs.toArray();
    const performances = await encoreDb.performances.toArray();
    const extras = await encoreDb.repertoireExtras.get('default');
    const localMax = maxRepertoireClock(songs, performances, extras?.updatedAt);

    const lastSynced = meta.lastSyncedLocalMaxUpdatedAt ?? '';
    const lastRemote = meta.lastRemoteModified ?? '';
    const localDirty = localMax > lastSynced;
    const remoteNewer = lastRemote === '' ? true : remoteModified > lastRemote;

    if (localDirty && lastRemote !== '' && remoteModified > lastRemote) {
      // Pull remote contents in-memory (no Dexie write yet) so we can compute a row-level diff.
      let analysis: ConflictAnalysis | undefined;
      try {
        const raw = await driveGetMedia(accessToken, layout.repertoireFileId);
        const wire = parseRepertoireWire(raw);
        analysis = analyzeRepertoireConflict(
          { songs, performances },
          { songs: wire.songs, performances: wire.performances },
          meta,
        );
      } catch {
        // If we cannot read remote, fall back to coarse conflict.
      }
      const check: SyncCheckResult = {
        conflict: true,
        reason: 'local_and_remote_changed',
        remoteModified,
        remoteEtag: remoteMeta.etag,
        localMaxUpdatedAt: localMax,
        lastSyncedLocalMaxUpdatedAt: lastSynced || undefined,
        lastKnownRemoteModified: lastRemote || undefined,
      };
      return { ok: false, conflict: check, analysis };
    }

    if (remoteNewer) {
      onProgress?.(0.32);
      await pullRepertoireFromDrive(accessToken, layout.repertoireFileId, remoteMeta.etag, {
        onProgress: (p) => {
          if (p == null) {
            onProgress?.(null);
            return;
          }
          onProgress?.(0.32 + p * 0.62);
        },
      });
    } else if (localDirty) {
      onProgress?.(0.35);
      await pushRepertoireToDrive(accessToken, layout.repertoireFileId, meta.lastRemoteEtag, {
        onProgress: (p) => {
          if (p == null) {
            onProgress?.(null);
            return;
          }
          onProgress?.(0.35 + p * 0.62);
        },
      });
    }
    onProgress?.(1);
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

/**
 * Resolve a conflict using per-row choices for the "both edited" rows. Non-conflicting rows are
 * always merged by `updatedAt` (newer wins).
 *
 * - choices entry `'local'`: keep this device's row, bump its updatedAt past remote so it wins on push.
 * - choices entry `'remote'`: copy the remote row into local Dexie verbatim.
 * - rows missing from `choices` default to whichever side is newer (auto-merge).
 *
 * After merging the in-memory result is committed to Dexie and pushed to Drive in one step.
 */
export async function resolveConflictWithChoices(
  accessToken: string,
  choices: Map<string, 'local' | 'remote'>,
): Promise<void> {
  const meta = await getSyncMeta();
  if (!meta.repertoireFileId) throw new Error('Not bootstrapped');

  const raw = await driveGetMedia(accessToken, meta.repertoireFileId);
  const wire = parseRepertoireWire(raw);
  const localSongs = await encoreDb.songs.toArray();
  const localPerf = await encoreDb.performances.toArray();

  const remoteSongsById = new Map(wire.songs.map((s) => [s.id, s] as const));
  const remotePerfById = new Map(wire.performances.map((p) => [p.id, p] as const));
  const localSongsById = new Map(localSongs.map((s) => [s.id, s] as const));
  const localPerfById = new Map(localPerf.map((p) => [p.id, p] as const));

  /** Raise the updatedAt timestamp past `floor` so this row wins on the next push. */
  const bumpedClock = (current: string, floor: string): string => {
    if (current > floor) return current;
    const base = floor || current || new Date().toISOString();
    const t = new Date(base).getTime();
    return Number.isFinite(t) ? new Date(t + 1).toISOString() : new Date().toISOString();
  };

  const mergedSongs: EncoreSong[] = [];
  const allSongIds = new Set([...localSongsById.keys(), ...remoteSongsById.keys()]);
  for (const id of allSongIds) {
    const l = localSongsById.get(id);
    const r = remoteSongsById.get(id);
    if (l && r) {
      const choice = choices.get(id);
      if (choice === 'local') {
        mergedSongs.push({ ...l, updatedAt: bumpedClock(l.updatedAt, r.updatedAt) });
      } else if (choice === 'remote') {
        mergedSongs.push(r);
      } else {
        mergedSongs.push(l.updatedAt >= r.updatedAt ? l : r);
      }
    } else {
      mergedSongs.push((l ?? r) as EncoreSong);
    }
  }

  const mergedPerf: EncorePerformance[] = [];
  const allPerfIds = new Set([...localPerfById.keys(), ...remotePerfById.keys()]);
  for (const id of allPerfIds) {
    const l = localPerfById.get(id);
    const r = remotePerfById.get(id);
    if (l && r) {
      const choice = choices.get(id);
      if (choice === 'local') {
        mergedPerf.push({ ...l, updatedAt: bumpedClock(l.updatedAt, r.updatedAt) });
      } else if (choice === 'remote') {
        mergedPerf.push(r);
      } else {
        mergedPerf.push(l.updatedAt >= r.updatedAt ? l : r);
      }
    } else {
      mergedPerf.push((l ?? r) as EncorePerformance);
    }
  }

  const extrasRow = repertoireExtrasFromWire(wire);
  await encoreDb.transaction(
    'rw',
    encoreDb.songs,
    encoreDb.performances,
    encoreDb.repertoireExtras,
    async () => {
      await encoreDb.songs.clear();
      await encoreDb.performances.clear();
      await encoreDb.songs.bulkPut(mergedSongs);
      await encoreDb.performances.bulkPut(mergedPerf);
      await encoreDb.repertoireExtras.put(extrasRow);
    },
  );

  // Push the merged result without an If-Match etag — we are intentionally overwriting Drive
  // with the user-selected merge (the row choices already represent their intent for the
  // "both-edited" overlap; pull-then-push is unnecessary).
  await pushRepertoireToDrive(accessToken, meta.repertoireFileId, undefined);
}
