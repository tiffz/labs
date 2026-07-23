import { encoreDb, getSyncMeta, patchSyncMeta, type SyncMetaRow } from '../db/encoreDb';
import type { EncorePerformance, EncoreSong } from '../types';
import {
  buildWireFromTables,
  defaultRepertoireExtrasRow,
  maxRepertoireClock,
  mergeRepertoireExtras,
  parseRepertoireWire,
  repertoireExtrasFromWire,
  serializeRepertoireWire,
} from './repertoireWire';
import { maybePinDailyDriveFileRevision } from '../../shared/drive/driveRevisionPinning';
import { driveGetFileMetadata, driveGetMedia, drivePatchJsonMedia } from './driveFetch';
import { ensureEncoreDriveLayout } from './bootstrapFolders';
import { snapshotEncoreRepertoireBeforeSync } from './encoreDriveUndoSnapshots';
import { isShardedSyncEnabled, pullChangedShards } from './repertoireSharded';
import {
  mergeExerciseRunLists,
  mergePerformancePreservingVideos,
  mergePerformanceRecords,
  mergeSongPreservingExercises,
  mergeSongRecords,
  songExerciseAnswerCount,
} from './encoreRepertoireMerge';
import {
  assertLabsDriveWriteAllowed,
} from '../../shared/drive/labsDriveSyncGuard';
import { filterTombstonedRows, type RepertoireTombstones } from './encoreRepertoireTombstones';

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
  /** Filled exercise answers on each side (song rows only) — surfaced so a coarse pick is informed. */
  localAnswerCount?: number;
  remoteAnswerCount?: number;
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
  /**
   * Auto-push data-loss gate (P0). The push refuses to run unless a reconciling pull has succeeded
   * this session (`autoPushAllowed`) or the caller is an explicit user-confirmed replace
   * (`intentionalReplace`). The gate is **fail-closed**: a caller that omits `writeGuard` is treated
   * as `{autoPushAllowed:false, intentionalReplace:false}` and blocked, so "no sparse push before a
   * reconciling pull" is structural — a forgotten guard cannot silently bypass Layer 2
   * (DRIVE_SYNC_DATA_LOSS_PREVENTION Layer 2; labsDriveSyncGuard).
   */
  writeGuard?: { autoPushAllowed: boolean; intentionalReplace?: boolean };
};

/** Human-readable app-folder name used in the auto-push-blocked error copy. */
const ENCORE_DRIVE_FOLDER_NAME = 'Encore';

export type RunInitialSyncOptions = {
  onProgress?: RepertoireSyncProgress;
};

export async function pullRepertoireFromDrive(
  accessToken: string,
  repertoireFileId: string,
  remoteEtag?: string,
  opts?: PullRepertoireOptions,
): Promise<void> {
  await snapshotEncoreRepertoireBeforeSync('pre-pull');
  const onProgress = opts?.onProgress;
  onProgress?.(0.05);
  const raw = await driveGetMedia(accessToken, repertoireFileId);
  onProgress?.(0.22);
  const wire = parseRepertoireWire(raw);
  onProgress?.(0.32);
  const localSongs = await encoreDb.songs.toArray();
  const localPerf = await encoreDb.performances.toArray();
  const extrasRow = repertoireExtrasFromWire(wire);
  const localExtrasRow =
    (await encoreDb.repertoireExtras.get('default')) ?? defaultRepertoireExtrasRow(extrasRow.updatedAt);
  const mergedExtras = mergeRepertoireExtras(localExtrasRow, extrasRow);
  const deletedRunIds = new Set(mergedExtras.deletedExerciseRunIds ?? []);
  // Content-aware: never let a newer-but-empty song row wipe filled exercise answers (ADR 0019).
  // Tombstone filter (clock supersede): a deleted row stays deleted unless it was restored/re-edited
  // with a newer `updatedAt` than its tombstone — so cross-device undo of a delete is not lost (B1).
  const mergedSongs = filterTombstonedRows(
    mergeSongRecords(localSongs, wire.songs, { deletedRunIds }),
    mergedExtras.deletedSongIds,
  );
  // Content-aware: union `videos` by id so a video logged on another device is never dropped by a
  // newer-but-sparser copy (PERFORMANCE_MERGE_POLICY). Tombstone filter drops purged performances.
  const mergedPerf = filterTombstonedRows(
    mergePerformanceRecords(localPerf, wire.performances),
    mergedExtras.deletedPerformanceIds,
  );
  onProgress?.(0.48);
  await yieldToMain();
  await encoreDb.transaction('rw', encoreDb.songs, encoreDb.performances, encoreDb.repertoireExtras, encoreDb.dirtySync, async () => {
    await encoreDb.songs.clear();
    await encoreDb.performances.clear();
    await encoreDb.dirtySync.clear();
    await encoreDb.songs.bulkPut(mergedSongs);
    await encoreDb.performances.bulkPut(mergedPerf);
    await encoreDb.repertoireExtras.put(mergedExtras);
  });
  onProgress?.(0.72);
  const meta = await driveGetFileMetadata(accessToken, repertoireFileId);
  const localMax = maxRepertoireClock(mergedSongs, mergedPerf, mergedExtras.updatedAt);
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
  // Fail-closed: omitting writeGuard means neither condition holds, so the write is blocked. Every
  // caller must consciously declare autoPushAllowed (post-pull) or intentionalReplace (user action).
  assertLabsDriveWriteAllowed({
    appFolderName: ENCORE_DRIVE_FOLDER_NAME,
    autoPushAllowed: opts?.writeGuard?.autoPushAllowed ?? false,
    intentionalReplace: opts?.writeGuard?.intentionalReplace ?? false,
  });
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
  void maybePinDailyDriveFileRevision(accessToken, repertoireFileId);
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
    localAnswerCount: s ? songExerciseAnswerCount(s) : undefined,
    remoteAnswerCount: remote ? songExerciseAnswerCount(remote) : undefined,
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

/** Delete tombstones (per-id `deletedAt` clock) known at conflict-analysis time. */
export interface RepertoireConflictTombstones {
  deletedSongIds?: RepertoireTombstones;
  deletedPerformanceIds?: RepertoireTombstones;
}

/**
 * Compute a row-level conflict analysis between local and remote repertoire snapshots. Used by
 * the new {@link runInitialSyncIfPossible} flow: when `bothEdited.length === 0` we silently
 * auto-merge; otherwise the conflict review dialog asks the user only about the overlapping rows.
 *
 * Tombstoned rows are dropped from both sides first (clock supersede — the same
 * {@link filterTombstonedRows} the resolve/pull paths apply), so a row already deleted on either
 * device is never surfaced as a choice the merge would then silently discard (S3). A row restored
 * with a newer `updatedAt` than its tombstone survives the filter and is still surfaced.
 */
export function analyzeRepertoireConflict(
  local: { songs: EncoreSong[]; performances: EncorePerformance[] },
  remote: { songs: EncoreSong[]; performances: EncorePerformance[] },
  syncMeta: Pick<SyncMetaRow, 'lastSyncedLocalMaxUpdatedAt' | 'lastRemoteModified'>,
  tombstones?: RepertoireConflictTombstones,
): ConflictAnalysis {
  const lastSynced = syncMeta.lastSyncedLocalMaxUpdatedAt ?? '';
  const lastRemote = syncMeta.lastRemoteModified ?? '';

  const liveLocalSongs = filterTombstonedRows(local.songs, tombstones?.deletedSongIds);
  const liveRemoteSongs = filterTombstonedRows(remote.songs, tombstones?.deletedSongIds);
  const liveLocalPerf = filterTombstonedRows(local.performances, tombstones?.deletedPerformanceIds);
  const liveRemotePerf = filterTombstonedRows(remote.performances, tombstones?.deletedPerformanceIds);

  const localSongsById = new Map(liveLocalSongs.map((s) => [s.id, s] as const));
  const remoteSongsById = new Map(liveRemoteSongs.map((s) => [s.id, s] as const));
  const localPerfById = new Map(liveLocalPerf.map((p) => [p.id, p] as const));
  const remotePerfById = new Map(liveRemotePerf.map((p) => [p.id, p] as const));

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
        // Union local + remote delete tombstones so analysis matches the post-resolution filter:
        // a row already deleted on either device is not offered as a conflict choice (S3).
        const remoteExtrasRow = repertoireExtrasFromWire(wire);
        const localExtrasRow = extras ?? defaultRepertoireExtrasRow(remoteExtrasRow.updatedAt);
        const mergedExtras = mergeRepertoireExtras(localExtrasRow, remoteExtrasRow);
        analysis = analyzeRepertoireConflict(
          { songs, performances },
          { songs: wire.songs, performances: wire.performances },
          meta,
          {
            deletedSongIds: mergedExtras.deletedSongIds,
            deletedPerformanceIds: mergedExtras.deletedPerformanceIds,
          },
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
      if (isShardedSyncEnabled()) {
        await pullChangedShards(accessToken);
      }
    } else if (localDirty) {
      onProgress?.(0.35);
      await pushRepertoireToDrive(accessToken, layout.repertoireFileId, meta.lastRemoteEtag, {
        // Reaches here only when localDirty && !remoteNewer, which implies a prior pull set
        // lastRemote (remoteNewer is forced true when lastRemote is empty), so the reconciling
        // read has happened — the push is allowed.
        writeGuard: { autoPushAllowed: true },
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
  await pushRepertoireToDrive(accessToken, meta.repertoireFileId, m2.lastRemoteEtag, {
    writeGuard: { autoPushAllowed: true, intentionalReplace: true },
  });
}

export async function resolveConflictKeepLocal(accessToken: string): Promise<void> {
  const meta = await getSyncMeta();
  if (!meta.repertoireFileId) throw new Error('Not bootstrapped');
  // User explicitly chose "keep this device" — an intentional replace of the cloud copy.
  await pushRepertoireToDrive(accessToken, meta.repertoireFileId, undefined, {
    writeGuard: { autoPushAllowed: false, intentionalReplace: true },
  });
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
  await snapshotEncoreRepertoireBeforeSync('pre-merge');
  const meta = await getSyncMeta();
  if (!meta.repertoireFileId) throw new Error('Not bootstrapped');

  const raw = await driveGetMedia(accessToken, meta.repertoireFileId);
  const wire = parseRepertoireWire(raw);
  const localSongs = await encoreDb.songs.toArray();
  const localPerf = await encoreDb.performances.toArray();
  const extrasRow = repertoireExtrasFromWire(wire);
  const localExtrasRow =
    (await encoreDb.repertoireExtras.get('default')) ?? defaultRepertoireExtrasRow(wire.exportedAt);
  const mergedExtras = mergeRepertoireExtras(localExtrasRow, extrasRow);
  const deletedRunIds = new Set(mergedExtras.deletedExerciseRunIds ?? []);

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

  /**
   * Apply a coarse row choice while still merging exercise runs non-destructively: a "keep device"
   * or "use Drive" pick selects the *scalar* fields, but answers that only exist on the other side
   * are never silently dropped (ADR 0019 — the user clicked "Use Drive" not realizing it would
   * delete hours of filled answers). The content-aware conflict dialog surfaces what is at stake.
   */
  const applySongChoice = (
    l: EncoreSong,
    r: EncoreSong,
    choice: 'local' | 'remote' | undefined,
  ): EncoreSong => {
    const runs = mergeExerciseRunLists(l.practiceExerciseRuns, r.practiceExerciseRuns, { deletedRunIds });
    const withRuns = (base: EncoreSong): EncoreSong => {
      const next: EncoreSong = { ...base };
      if (runs) next.practiceExerciseRuns = runs;
      else delete next.practiceExerciseRuns;
      return next;
    };
    if (choice === 'local') return withRuns({ ...l, updatedAt: bumpedClock(l.updatedAt, r.updatedAt) });
    if (choice === 'remote') return withRuns(r);
    return mergeSongPreservingExercises(l, r, { deletedRunIds });
  };

  const mergedSongs: EncoreSong[] = [];
  const allSongIds = new Set([...localSongsById.keys(), ...remoteSongsById.keys()]);
  for (const id of allSongIds) {
    const l = localSongsById.get(id);
    const r = remoteSongsById.get(id);
    if (l && r) {
      mergedSongs.push(applySongChoice(l, r, choices.get(id)));
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
        // Auto-merge (no explicit choice): content-aware — union videos so a video logged on the
        // other device is not dropped by a newer-but-sparser copy (PERFORMANCE_MERGE_POLICY).
        mergedPerf.push(mergePerformancePreservingVideos(l, r));
      }
    } else {
      mergedPerf.push((l ?? r) as EncorePerformance);
    }
  }

  // Honor delete tombstones so a resolved conflict cannot resurrect a row deleted on any device.
  const filteredSongs = filterTombstonedRows(mergedSongs, mergedExtras.deletedSongIds);
  const filteredPerf = filterTombstonedRows(mergedPerf, mergedExtras.deletedPerformanceIds);

  await encoreDb.transaction(
    'rw',
    encoreDb.songs,
    encoreDb.performances,
    encoreDb.repertoireExtras,
    encoreDb.dirtySync,
    async () => {
      await encoreDb.songs.clear();
      await encoreDb.performances.clear();
      await encoreDb.dirtySync.clear();
      await encoreDb.songs.bulkPut(filteredSongs);
      await encoreDb.performances.bulkPut(filteredPerf);
      await encoreDb.repertoireExtras.put(mergedExtras);
    },
  );

  // Push the merged result without an If-Match etag — we are intentionally overwriting Drive
  // with the user-selected merge (the row choices already represent their intent for the
  // "both-edited" overlap; pull-then-push is unnecessary).
  await pushRepertoireToDrive(accessToken, meta.repertoireFileId, undefined, {
    writeGuard: { autoPushAllowed: true, intentionalReplace: true },
  });
}
