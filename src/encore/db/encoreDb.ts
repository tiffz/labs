import Dexie, { type Table } from 'dexie';
import type {
  EncoreDriveUploadFolderOverrideLabels,
  EncoreDriveUploadFolderOverrides,
  EncoreMilestoneDefinition,
  EncorePerformance,
  EncoreRepertoireSavedSearch,
  EncoreSong,
  EncoreTableUiBundle,
} from '../types';
import type { EncoreOriginalSong } from '../originals/types';
import type { EncoreDriveContentIndex } from '../drive/encoreDriveContentIndex';

export interface SyncMetaRow {
  id: 'default';
  rootFolderId?: string;
  performancesFolderId?: string;
  sheetMusicFolderId?: string;
  /** Optional folder for uploaded song recordings (MP3, MIDI, etc.). */
  recordingsFolderId?: string;
  repertoireFileId?: string;
  snapshotFileId?: string;
  /** ISO timestamp — updated when owner publishes `public_snapshot.json` (guest link content). */
  lastPublishedSnapshotAt?: string;
  lastRemoteModified?: string;
  lastRemoteEtag?: string;
  /** Max song/performance `updatedAt` last successfully pushed */
  lastSyncedLocalMaxUpdatedAt?: string;
  lastSuccessfulPullAt?: string;
  lastSuccessfulPushAt?: string;
  /** Drive folderId for the sharded repertoire layout (`Encore_App/repertoire/`). */
  shardedRepertoireFolderId?: string;
  /** Drive fileId of the manifest at `Encore_App/repertoire/manifest.json`. */
  shardedManifestFileId?: string;
  /** Last manifest revision Encore reconciled against (Drive revision id or modified time). */
  shardedManifestRevision?: string;
  /** ISO timestamp Encore last finished a fan-out migration from the monolithic file. */
  shardedMigratedAt?: string;
  /** `Encore_App/Originals/` folder id. */
  originalsFolderId?: string;
  /** `Encore_App/Originals/originals_manifest.json` file id. */
  originalsManifestFileId?: string;
  originalsManifestRevision?: string;
  lastSyncedOriginalsMaxUpdatedAt?: string;
}

/**
 * One row per pending shard write. Granular writes mark rows dirty; the background sync drains
 * the table by pushing only the affected shards. Cleared rows mean the shard is up to date.
 */
export interface DirtySyncRow {
  /** Compound id: `<kind>:<rowId>` (e.g. `song:abc123`) — keeps the table cheap to upsert. */
  id: string;
  kind: 'song' | 'performance' | 'extras' | 'original';
  /** The Encore row id this shard mirrors. For `extras`, always `"default"`. */
  rowId: string;
  /**
   * What the dirty entry represents — `upsert` writes the current row, `delete` removes the shard.
   * Lets the background pusher emit `DELETE` requests for rows the user removed locally.
   */
  op: 'upsert' | 'delete';
  /** ISO timestamp of when the row was marked dirty (debug + ordering). */
  markedAt: string;
}

/** Single-row table: venue catalog + global milestone template (mirrors `repertoire_data.json` extras). */
export interface RepertoireExtrasRow {
  id: 'default';
  venueCatalog: string[];
  milestoneTemplate: EncoreMilestoneDefinition[];
  /**
   * Optional owner display name override. Defaults to Google profile name when present.
   * Persists locally and syncs through `repertoire_data.json`; mirrored into the public snapshot
   * on publish so guests see "{name}'s repertoire".
   */
  ownerDisplayName?: string;
  /** Spotify playlist id for Practice page “Currently learning” playlist sync. */
  currentlyLearningSpotifyPlaylistId?: string;
  /**
   * Track ids present in the Currently Learning playlist as of the last successful import
   * phase. Drives the "Spotify-side removal flows back" path in {@link runEncoreSpotifyPlaylistSync}.
   */
  lastSyncedLearningPlaylistTrackIds?: string[];
  /**
   * Guest snapshot only: when true, only songs with at least one logged performance are published.
   */
  repertoireSpotifySyncPerformedOnly?: boolean;
  /** Named saved searches with optional Spotify playlist sync. */
  repertoireSavedSearches?: EncoreRepertoireSavedSearch[];
  /** Table column prefs for repertoire / performances (mirrors wire `tableUi`). */
  tableUi?: EncoreTableUiBundle;
  /** Optional Drive folder ids for category uploads; default = Encore `Encore_App` subfolders. */
  driveUploadFolderOverrides?: EncoreDriveUploadFolderOverrides;
  /** Optional labels for override folders (Drive folder titles). */
  driveUploadFolderOverrideLabels?: EncoreDriveUploadFolderOverrideLabels;
  /**
   * Content-hash index for O(1) duplicate detection at upload time (`contentFingerprintGroupKey`
   * → canonical Drive file). Rebuilt during organize; updated after uploads.
   */
  driveContentIndex?: EncoreDriveContentIndex;
  /**
   * Exercise run ids the user cleared locally — union merge skips these so deletes propagate
   * across devices (see ADR 0019 follow-up).
   */
  deletedExerciseRunIds?: string[];
  /**
   * Deleted-song tombstones as `id -> deletedAt` (ISO). The pull merge filters a song only when its
   * tombstone `deletedAt >= song.updatedAt`, so a delete is not resurrected by a peer's stale copy
   * yet a restored/re-edited song with a newer clock supersedes its tombstone (P0 + B1 fixes).
   * Recorded/cleared via `encoreRepertoireTombstones`.
   */
  deletedSongIds?: Record<string, string>;
  /** Deleted-performance tombstones as `id -> deletedAt` (ISO); same clock-supersede semantics. */
  deletedPerformanceIds?: Record<string, string>;
  updatedAt: string;
}

export class EncoreDB extends Dexie {
  songs!: Table<EncoreSong, string>;
  performances!: Table<EncorePerformance, string>;
  originals!: Table<EncoreOriginalSong, string>;
  originalTakeBlobs!: Table<import('../originals/originalTakeLocalAudio').OriginalTakeBlobRow, string>;
  syncMeta!: Table<SyncMetaRow, string>;
  repertoireExtras!: Table<RepertoireExtrasRow, string>;
  dirtySync!: Table<DirtySyncRow, string>;

  constructor() {
    super('encore-repertoire');
    this.version(1).stores({
      songs: 'id, updatedAt, title, artist',
      performances: 'id, songId, date, updatedAt, venueTag',
      syncMeta: 'id',
    });
    this.version(2).stores({
      songs: 'id, updatedAt, title, artist',
      performances: 'id, songId, date, updatedAt, venueTag',
      syncMeta: 'id',
    });
    this.version(3).stores({
      songs: 'id, updatedAt, title, artist, practicing',
      performances: 'id, songId, date, updatedAt, venueTag',
      syncMeta: 'id',
      repertoireExtras: 'id',
    });
    this.version(4).stores({
      songs: 'id, updatedAt, title, artist, practicing',
      performances: 'id, songId, date, updatedAt, venueTag',
      syncMeta: 'id',
      repertoireExtras: 'id',
      dirtySync: 'id, kind, markedAt',
    });
    this.version(5).stores({
      songs: 'id, updatedAt, title, artist, practicing',
      performances: 'id, songId, date, updatedAt, venueTag',
      originals: 'id, updatedAt, title, status',
      syncMeta: 'id',
      repertoireExtras: 'id',
      dirtySync: 'id, kind, markedAt',
    });
    this.version(6).stores({
      songs: 'id, updatedAt, title, artist, practicing',
      performances: 'id, songId, date, updatedAt, venueTag',
      originals: 'id, updatedAt, title',
      syncMeta: 'id',
      repertoireExtras: 'id',
      dirtySync: 'id, kind, markedAt',
    });
    this.version(7).stores({
      songs: 'id, updatedAt, title, artist, practicing',
      performances: 'id, songId, date, updatedAt, venueTag',
      originals: 'id, updatedAt, title',
      originalTakeBlobs: 'id, songId, takeId, updatedAt',
      syncMeta: 'id',
      repertoireExtras: 'id',
      dirtySync: 'id, kind, markedAt',
    });
  }
}

export const encoreDb = new EncoreDB();

export async function getSyncMeta(): Promise<SyncMetaRow> {
  const row = await encoreDb.syncMeta.get('default');
  if (row) return row;
  const initial: SyncMetaRow = { id: 'default' };
  await encoreDb.syncMeta.put(initial);
  return initial;
}

export async function patchSyncMeta(patch: Partial<Omit<SyncMetaRow, 'id'>>): Promise<void> {
  const cur = await getSyncMeta();
  const defined = Object.fromEntries(
    Object.entries(patch as Record<string, unknown>).filter(([, v]) => v !== undefined),
  ) as Partial<Omit<SyncMetaRow, 'id'>>;
  await encoreDb.syncMeta.put({ ...cur, ...defined, id: 'default' });
}

/** Compose the compound id used by the {@link DirtySyncRow} table. */
export function dirtySyncRowKey(kind: DirtySyncRow['kind'], rowId: string): string {
  return `${kind}:${rowId}`;
}

/** Mark a row dirty for the next sharded sync push. Safe to call repeatedly — it upserts. */
export async function markDirtyRow(
  kind: DirtySyncRow['kind'],
  rowId: string,
  op: DirtySyncRow['op'] = 'upsert',
): Promise<void> {
  await encoreDb.dirtySync.put({
    id: dirtySyncRowKey(kind, rowId),
    kind,
    rowId,
    op,
    markedAt: new Date().toISOString(),
  });
}

/** Bulk-mark variant; combined with `markDirtyRow` for single-row writes. */
export async function markDirtyRows(
  rows: Array<{ kind: DirtySyncRow['kind']; rowId: string; op?: DirtySyncRow['op'] }>,
): Promise<void> {
  if (rows.length === 0) return;
  const now = new Date().toISOString();
  await encoreDb.dirtySync.bulkPut(
    rows.map((r) => ({
      id: dirtySyncRowKey(r.kind, r.rowId),
      kind: r.kind,
      rowId: r.rowId,
      op: r.op ?? 'upsert',
      markedAt: now,
    })),
  );
}

/** Drain dirty entries; used by the sharded background sync to know what to push. */
export async function takeDirtyRows(): Promise<DirtySyncRow[]> {
  return encoreDb.dirtySync.toArray();
}

/** Clear specific dirty entries after a successful push. */
export async function clearDirtyRows(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await encoreDb.dirtySync.bulkDelete(ids);
}
