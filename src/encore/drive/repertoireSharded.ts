/**
 * Sharded Drive layout (Phase 5 of the Encore performance overhaul).
 *
 * Drive layout (under the user's "My Drive"):
 *
 * ```
 * Encore_App/
 *   repertoire_data.json            // legacy monolithic file (kept for back-compat / fallback)
 *   repertoire/
 *     manifest.json                 // small row-id → shard fileId index (+ per-row updatedAt)
 *     song/<id>.json                // one per song
 *     performance/<id>.json         // one per performance
 *     extras/default.json           // single file for the venue catalog + milestone template
 * ```
 *
 * The manifest is the single coordination point: pulls re-read it to discover which shards changed,
 * and pushes update it to advertise the new shard fileIds (or removed entries). Per-row JSONs are
 * tiny so individual writes are cheap, and the dirty-row table (see {@link import('../db/encoreDb').DirtySyncRow})
 * lets the background pusher upload only what actually changed since the last sync.
 *
 * This module is currently behind {@link isShardedSyncEnabled} and is wired alongside the
 * monolithic flow. Production keeps using `repertoire_data.json` until the shard path has soaked.
 */

import {
  clearDirtyRows,
  encoreDb,
  getSyncMeta,
  patchSyncMeta,
  takeDirtyRows,
  type DirtySyncRow,
} from '../db/encoreDb';
import { defaultRepertoireExtrasRow } from './repertoireWire';
import type { EncorePerformance, EncoreSong } from '../types';
import {
  driveCreateFolder,
  driveCreateJsonFile,
  driveGetFileMetadata,
  driveGetMedia,
  driveListFiles,
  drivePatchJsonMedia,
  driveTrashFile,
} from './driveFetch';
import { ensureEncoreDriveLayout } from './bootstrapFolders';
import {
  ENCORE_SHARDED_EXTRAS_FILE,
  ENCORE_SHARDED_EXTRAS_FOLDER,
  ENCORE_SHARDED_MANIFEST_FILE,
  ENCORE_SHARDED_PERFORMANCE_FOLDER,
  ENCORE_SHARDED_REPERTOIRE_FOLDER,
  ENCORE_SHARDED_SONG_FOLDER,
} from './constants';

/** Compile-time + runtime gate for the sharded sync path. Treats anything truthy as "on". */
export function isShardedSyncEnabled(): boolean {
  const raw = (import.meta.env.VITE_ENCORE_SHARDED_SYNC as string | boolean | undefined) ?? '';
  if (typeof raw === 'boolean') return raw;
  const norm = String(raw).trim().toLowerCase();
  return norm === '1' || norm === 'true' || norm === 'yes' || norm === 'on';
}

export type ShardKind = DirtySyncRow['kind'];

/** A single row's pointer in the manifest (row id → drive fileId + clock). */
export interface ShardEntry {
  fileId: string;
  updatedAt: string;
}

/**
 * The manifest written to `Encore_App/repertoire/manifest.json`. Keep this file small —
 * a clean 1k-song library should still land well under 100KB so reads are cheap.
 */
export interface ShardedRepertoireManifest {
  version: 1;
  exportedAt: string;
  songs: Record<string, ShardEntry>;
  performances: Record<string, ShardEntry>;
  /** Single-row table; `default` is the only id in v1. */
  extras: Record<string, ShardEntry>;
}

export interface ShardedRepertoireLayout {
  shardedFolderId: string;
  songFolderId: string;
  performanceFolderId: string;
  extrasFolderId: string;
  manifestFileId: string;
}

function emptyManifest(): ShardedRepertoireManifest {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    songs: {},
    performances: {},
    extras: {},
  };
}

function parseManifest(json: string): ShardedRepertoireManifest {
  const data = JSON.parse(json) as Partial<ShardedRepertoireManifest>;
  if (data.version !== 1) {
    throw new Error('Invalid repertoire manifest (unknown version)');
  }
  return {
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    songs: (data.songs && typeof data.songs === 'object' ? data.songs : {}) as Record<string, ShardEntry>,
    performances: (data.performances && typeof data.performances === 'object'
      ? data.performances
      : {}) as Record<string, ShardEntry>,
    extras: (data.extras && typeof data.extras === 'object' ? data.extras : {}) as Record<string, ShardEntry>,
  };
}

function manifestSlot(manifest: ShardedRepertoireManifest, kind: ShardKind): Record<string, ShardEntry> {
  switch (kind) {
    case 'song':
      return manifest.songs;
    case 'performance':
      return manifest.performances;
    case 'extras':
      return manifest.extras;
  }
}

function shardFolderId(layout: ShardedRepertoireLayout, kind: ShardKind): string {
  switch (kind) {
    case 'song':
      return layout.songFolderId;
    case 'performance':
      return layout.performanceFolderId;
    case 'extras':
      return layout.extrasFolderId;
  }
}

function shardFileName(kind: ShardKind, rowId: string): string {
  if (kind === 'extras') return ENCORE_SHARDED_EXTRAS_FILE;
  return `${rowId}.json`;
}

function qFolderInParent(name: string, parentId: string): string {
  return `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
}

function qJsonInParent(name: string, parentId: string): string {
  return `name='${name.replace(/'/g, "\\'")}' and mimeType='application/json' and '${parentId}' in parents and trashed=false`;
}

async function ensureSubfolder(accessToken: string, name: string, parentId: string): Promise<string> {
  const list = await driveListFiles(accessToken, qFolderInParent(name, parentId));
  const existing = (list.files?.[0] as { id?: string } | undefined)?.id;
  if (existing) return existing;
  const created = await driveCreateFolder(accessToken, name, parentId);
  return created.id;
}

/**
 * Ensure the sharded layout exists on Drive (folder tree + manifest file). Caller must have
 * already ensured the legacy `Encore_App/` layout via {@link ensureEncoreDriveLayout}.
 */
export async function ensureShardedRepertoireLayout(accessToken: string): Promise<ShardedRepertoireLayout> {
  const meta = await getSyncMeta();
  if (meta.shardedRepertoireFolderId && meta.shardedManifestFileId) {
    // Trust the cached ids; if Drive has trashed them, the next push will surface the failure.
    const songFolderId = await ensureSubfolder(
      accessToken,
      ENCORE_SHARDED_SONG_FOLDER,
      meta.shardedRepertoireFolderId,
    );
    const performanceFolderId = await ensureSubfolder(
      accessToken,
      ENCORE_SHARDED_PERFORMANCE_FOLDER,
      meta.shardedRepertoireFolderId,
    );
    const extrasFolderId = await ensureSubfolder(
      accessToken,
      ENCORE_SHARDED_EXTRAS_FOLDER,
      meta.shardedRepertoireFolderId,
    );
    return {
      shardedFolderId: meta.shardedRepertoireFolderId,
      songFolderId,
      performanceFolderId,
      extrasFolderId,
      manifestFileId: meta.shardedManifestFileId,
    };
  }

  const base = await ensureEncoreDriveLayout(accessToken);
  const shardedFolderId = await ensureSubfolder(
    accessToken,
    ENCORE_SHARDED_REPERTOIRE_FOLDER,
    base.rootFolderId,
  );
  const [songFolderId, performanceFolderId, extrasFolderId] = await Promise.all([
    ensureSubfolder(accessToken, ENCORE_SHARDED_SONG_FOLDER, shardedFolderId),
    ensureSubfolder(accessToken, ENCORE_SHARDED_PERFORMANCE_FOLDER, shardedFolderId),
    ensureSubfolder(accessToken, ENCORE_SHARDED_EXTRAS_FOLDER, shardedFolderId),
  ]);

  const manifestList = await driveListFiles(
    accessToken,
    qJsonInParent(ENCORE_SHARDED_MANIFEST_FILE, shardedFolderId),
  );
  let manifestFileId = (manifestList.files?.[0] as { id?: string } | undefined)?.id;
  if (!manifestFileId) {
    const created = await driveCreateJsonFile(
      accessToken,
      JSON.stringify(emptyManifest()),
      ENCORE_SHARDED_MANIFEST_FILE,
      [shardedFolderId],
    );
    manifestFileId = created.id;
  }

  await patchSyncMeta({
    shardedRepertoireFolderId: shardedFolderId,
    shardedManifestFileId: manifestFileId,
  });

  return {
    shardedFolderId,
    songFolderId,
    performanceFolderId,
    extrasFolderId,
    manifestFileId,
  };
}

/** Read the current manifest from Drive. Caller is responsible for caching the result. */
export async function readShardedManifest(
  accessToken: string,
  manifestFileId: string,
): Promise<ShardedRepertoireManifest> {
  const raw = await driveGetMedia(accessToken, manifestFileId);
  if (!raw.trim()) return emptyManifest();
  return parseManifest(raw);
}

/** Write the manifest back to Drive (single round-trip; callers normally batch into one push). */
export async function writeShardedManifest(
  accessToken: string,
  manifestFileId: string,
  manifest: ShardedRepertoireManifest,
  ifMatch?: string,
): Promise<{ etag?: string; modifiedTime?: string }> {
  const result = await drivePatchJsonMedia(
    accessToken,
    manifestFileId,
    JSON.stringify({ ...manifest, exportedAt: new Date().toISOString() }),
    ifMatch,
  );
  return { etag: result.etag, modifiedTime: result.modifiedTime };
}

interface ShardWriteContext {
  accessToken: string;
  layout: ShardedRepertoireLayout;
  manifest: ShardedRepertoireManifest;
}

async function upsertShardFile(
  ctx: ShardWriteContext,
  kind: ShardKind,
  rowId: string,
  body: string,
  updatedAt: string,
): Promise<void> {
  const slot = manifestSlot(ctx.manifest, kind);
  const existing = slot[rowId];
  const folderId = shardFolderId(ctx.layout, kind);
  const fileName = shardFileName(kind, rowId);

  if (existing?.fileId) {
    try {
      await drivePatchJsonMedia(ctx.accessToken, existing.fileId, body, undefined);
      slot[rowId] = { fileId: existing.fileId, updatedAt };
      return;
    } catch {
      // Fall through to create — the cached fileId may have been trashed out-of-band.
    }
  }
  const created = await driveCreateJsonFile(ctx.accessToken, body, fileName, [folderId]);
  slot[rowId] = { fileId: created.id, updatedAt };
}

async function deleteShardFile(ctx: ShardWriteContext, kind: ShardKind, rowId: string): Promise<void> {
  const slot = manifestSlot(ctx.manifest, kind);
  const existing = slot[rowId];
  if (existing?.fileId) {
    try {
      await driveTrashFile(ctx.accessToken, existing.fileId);
    } catch {
      // Best-effort: keep the manifest in sync even if Drive returns 404 / 410.
    }
  }
  delete slot[rowId];
}

function serializeRow(value: unknown): string {
  return JSON.stringify(value, null, 0);
}

/**
 * Push every dirty row to its own shard file and republish the manifest. Callers should hold
 * a coarse lock (the existing `drivePushChainRef` debounce in `EncoreSyncContext` is enough)
 * so two pushes do not race on the manifest. Returns the number of shards uploaded.
 */
export async function pushDirtyShards(
  accessToken: string,
  options?: { onProgress?: (pct: number | null) => void },
): Promise<number> {
  const onProgress = options?.onProgress;
  onProgress?.(0.05);

  const dirty = await takeDirtyRows();
  if (dirty.length === 0) {
    onProgress?.(1);
    return 0;
  }

  const layout = await ensureShardedRepertoireLayout(accessToken);
  onProgress?.(0.12);
  const manifest = await readShardedManifest(accessToken, layout.manifestFileId);
  onProgress?.(0.18);

  const ctx: ShardWriteContext = { accessToken, layout, manifest };
  const drainedIds: string[] = [];

  // Push in deterministic order (extras last, so a manifest re-read mid-flight still sees the
  // newest row payloads before the venue catalog).
  const ordered = [...dirty].sort((a, b) => {
    const order = { song: 0, performance: 1, extras: 2 } as const;
    return order[a.kind] - order[b.kind];
  });

  for (let i = 0; i < ordered.length; i += 1) {
    const entry = ordered[i];
    if (entry.op === 'delete') {
      await deleteShardFile(ctx, entry.kind, entry.rowId);
      drainedIds.push(entry.id);
    } else {
      const body = await loadRowBody(entry.kind, entry.rowId);
      if (!body) {
        // Row was deleted between dirty-mark and now; convert to a delete and drain.
        await deleteShardFile(ctx, entry.kind, entry.rowId);
        drainedIds.push(entry.id);
        continue;
      }
      const updatedAt = body.updatedAt;
      await upsertShardFile(ctx, entry.kind, entry.rowId, serializeRow(body.value), updatedAt);
      drainedIds.push(entry.id);
    }
    onProgress?.(0.2 + ((i + 1) / ordered.length) * 0.65);
  }

  await writeShardedManifest(accessToken, layout.manifestFileId, manifest);
  onProgress?.(0.92);
  await clearDirtyRows(drainedIds);

  const meta = await driveGetFileMetadata(accessToken, layout.manifestFileId);
  await patchSyncMeta({
    shardedManifestRevision: meta.modifiedTime,
    lastSuccessfulPushAt: new Date().toISOString(),
  });
  onProgress?.(1);
  return drainedIds.length;
}

interface RowBody {
  value: unknown;
  updatedAt: string;
}

async function loadRowBody(kind: ShardKind, rowId: string): Promise<RowBody | null> {
  if (kind === 'song') {
    const row = await encoreDb.songs.get(rowId);
    if (!row) return null;
    return { value: row, updatedAt: row.updatedAt };
  }
  if (kind === 'performance') {
    const row = await encoreDb.performances.get(rowId);
    if (!row) return null;
    return { value: row, updatedAt: row.updatedAt };
  }
  // extras (single row id `default`)
  const row = (await encoreDb.repertoireExtras.get('default')) ?? defaultRepertoireExtrasRow(new Date().toISOString());
  return { value: row, updatedAt: row.updatedAt };
}

/**
 * Pull only the shards whose manifest entry advertises an `updatedAt` newer than what we have
 * locally. Newly removed shards (manifest miss but local present) are deleted from Dexie.
 *
 * This is the "incremental pull" half of Phase 5; the call site is gated on
 * {@link isShardedSyncEnabled} so the legacy monolithic pull keeps running in production.
 */
export async function pullChangedShards(
  accessToken: string,
  options?: { onProgress?: (pct: number | null) => void },
): Promise<{ songs: number; performances: number; extras: number; deleted: number }> {
  const onProgress = options?.onProgress;
  onProgress?.(0.05);
  const layout = await ensureShardedRepertoireLayout(accessToken);
  const manifest = await readShardedManifest(accessToken, layout.manifestFileId);
  onProgress?.(0.18);

  const localSongs = new Map((await encoreDb.songs.toArray()).map((s) => [s.id, s] as const));
  const localPerf = new Map((await encoreDb.performances.toArray()).map((p) => [p.id, p] as const));
  const localExtras = await encoreDb.repertoireExtras.get('default');
  onProgress?.(0.24);

  const songEntries = Object.entries(manifest.songs);
  const perfEntries = Object.entries(manifest.performances);
  const extrasEntries = Object.entries(manifest.extras);
  const total = Math.max(1, songEntries.length + perfEntries.length + extrasEntries.length);
  let processed = 0;
  const tickProgress = (): void => {
    processed += 1;
    onProgress?.(0.24 + (processed / total) * 0.7);
  };

  let songCount = 0;
  let perfCount = 0;
  let extrasCount = 0;

  for (const [id, entry] of songEntries) {
    const local = localSongs.get(id);
    if (!local || local.updatedAt < entry.updatedAt) {
      const raw = await driveGetMedia(accessToken, entry.fileId);
      const parsed = JSON.parse(raw) as EncoreSong;
      await encoreDb.songs.put(parsed);
      songCount += 1;
    }
    tickProgress();
  }

  for (const [id, entry] of perfEntries) {
    const local = localPerf.get(id);
    if (!local || local.updatedAt < entry.updatedAt) {
      const raw = await driveGetMedia(accessToken, entry.fileId);
      const parsed = JSON.parse(raw) as EncorePerformance;
      await encoreDb.performances.put(parsed);
      perfCount += 1;
    }
    tickProgress();
  }

  for (const [, entry] of extrasEntries) {
    if (!localExtras || localExtras.updatedAt < entry.updatedAt) {
      const raw = await driveGetMedia(accessToken, entry.fileId);
      const parsed = JSON.parse(raw) as Partial<import('../db/encoreDb').RepertoireExtrasRow> | null;
      if (parsed && Array.isArray(parsed.venueCatalog) && Array.isArray(parsed.milestoneTemplate)) {
        await encoreDb.repertoireExtras.put({
          ...(parsed as import('../db/encoreDb').RepertoireExtrasRow),
          id: 'default',
        });
        extrasCount += 1;
      }
    }
    tickProgress();
  }

  // Delete locally-orphaned rows: present in Dexie, absent from manifest. Mirrors the manifest's
  // role as the source of truth in the sharded layout.
  let deleted = 0;
  for (const id of localSongs.keys()) {
    if (!manifest.songs[id]) {
      await encoreDb.songs.delete(id);
      deleted += 1;
    }
  }
  for (const id of localPerf.keys()) {
    if (!manifest.performances[id]) {
      await encoreDb.performances.delete(id);
      deleted += 1;
    }
  }

  const meta = await driveGetFileMetadata(accessToken, layout.manifestFileId);
  await patchSyncMeta({
    shardedManifestRevision: meta.modifiedTime,
    lastSuccessfulPullAt: new Date().toISOString(),
  });
  onProgress?.(1);
  return { songs: songCount, performances: perfCount, extras: extrasCount, deleted };
}

/**
 * One-time fan-out from the legacy monolithic `repertoire_data.json` into per-row shards. Idempotent:
 * if the manifest already contains rows we skip the migration. Should be called after a successful
 * pull so Dexie holds the merged truth.
 */
export async function migrateMonolithicToShardedIfNeeded(accessToken: string): Promise<{ migrated: boolean }> {
  const meta = await getSyncMeta();
  if (meta.shardedMigratedAt) return { migrated: false };

  const layout = await ensureShardedRepertoireLayout(accessToken);
  const manifest = await readShardedManifest(accessToken, layout.manifestFileId);
  // If anything is already in the manifest, we treat the migration as done — avoid duplicating files.
  const hasExistingShards =
    Object.keys(manifest.songs).length > 0 ||
    Object.keys(manifest.performances).length > 0 ||
    Object.keys(manifest.extras).length > 0;
  if (hasExistingShards) {
    await patchSyncMeta({ shardedMigratedAt: new Date().toISOString() });
    return { migrated: false };
  }

  const songs = await encoreDb.songs.toArray();
  const performances = await encoreDb.performances.toArray();
  const extras =
    (await encoreDb.repertoireExtras.get('default')) ?? defaultRepertoireExtrasRow(new Date().toISOString());

  const ctx: ShardWriteContext = { accessToken, layout, manifest };
  // Sequential to avoid hammering Drive's per-user write quota; Phase 5 follow-up can batch.
  for (const s of songs) {
    await upsertShardFile(ctx, 'song', s.id, serializeRow(s), s.updatedAt);
  }
  for (const p of performances) {
    await upsertShardFile(ctx, 'performance', p.id, serializeRow(p), p.updatedAt);
  }
  await upsertShardFile(ctx, 'extras', 'default', serializeRow(extras), extras.updatedAt);

  await writeShardedManifest(accessToken, layout.manifestFileId, manifest);
  await patchSyncMeta({ shardedMigratedAt: new Date().toISOString() });
  return { migrated: true };
}
