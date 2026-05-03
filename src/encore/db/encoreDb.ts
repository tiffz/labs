import Dexie, { type Table } from 'dexie';
import type {
  EncoreDriveUploadFolderOverrideLabels,
  EncoreDriveUploadFolderOverrides,
  EncoreMilestoneDefinition,
  EncorePerformance,
  EncoreSong,
  EncoreTableUiBundle,
} from '../types';

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
}

/**
 * One row per pending shard write. Granular writes mark rows dirty; the background sync drains
 * the table by pushing only the affected shards. Cleared rows mean the shard is up to date.
 */
export interface DirtySyncRow {
  /** Compound id: `<kind>:<rowId>` (e.g. `song:abc123`) — keeps the table cheap to upsert. */
  id: string;
  kind: 'song' | 'performance' | 'extras';
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
  /** Table column prefs for repertoire / performances (mirrors wire `tableUi`). */
  tableUi?: EncoreTableUiBundle;
  /** Optional Drive folder ids for category uploads; default = Encore `Encore_App` subfolders. */
  driveUploadFolderOverrides?: EncoreDriveUploadFolderOverrides;
  /** Optional labels for override folders (Drive folder titles). */
  driveUploadFolderOverrideLabels?: EncoreDriveUploadFolderOverrideLabels;
  updatedAt: string;
}

export class EncoreDB extends Dexie {
  songs!: Table<EncoreSong, string>;
  performances!: Table<EncorePerformance, string>;
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
