/**
 * Sharded Drive layout for Encore Originals under `Encore_App/Originals/`.
 */
import {
  clearDirtyRows,
  encoreDb,
  getSyncMeta,
  markDirtyRow,
  patchSyncMeta,
  takeDirtyRows,
  type DirtySyncRow,
} from '../../db/encoreDb';
import {
  driveCreateFolder,
  driveCreateJsonFile,
  driveGetFileMetadata,
  driveGetMedia,
  driveListFiles,
  drivePatchJsonMedia,
  driveTrashFile,
} from '../../drive/driveFetch';
import { ensureEncoreDriveLayout } from '../../drive/bootstrapFolders';
import {
  ENCORE_ORIGINALS_AUDIO_FOLDER,
  ENCORE_ORIGINALS_FOLDER,
  ENCORE_ORIGINALS_MANIFEST_FILE,
  ENCORE_ORIGINALS_REFERENCES_FOLDER,
  ENCORE_ORIGINALS_SHARD_SONG_FOLDER,
} from '../../drive/constants';
import { normalizeEncoreOriginalSong, type EncoreOriginalSong } from '../types';
import { mergeOriginalSongPreservingContent } from './encoreOriginalsMerge';
import { maxOriginalsClock } from './originalsWire';

export interface OriginalsShardEntry {
  fileId: string;
  updatedAt: string;
}

export interface OriginalsManifest {
  version: 1;
  exportedAt: string;
  originals: Record<string, OriginalsShardEntry>;
}

export interface OriginalsDriveLayout {
  originalsFolderId: string;
  songFolderId: string;
  audioFolderId: string;
  referencesFolderId: string;
  manifestFileId: string;
}

function emptyManifest(): OriginalsManifest {
  return { version: 1, exportedAt: new Date().toISOString(), originals: {} };
}

function parseManifest(json: string): OriginalsManifest {
  const data = JSON.parse(json) as Partial<OriginalsManifest>;
  if (data.version !== 1) throw new Error('Invalid originals manifest');
  return {
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    originals: (data.originals && typeof data.originals === 'object'
      ? data.originals
      : {}) as Record<string, OriginalsShardEntry>,
  };
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

export async function ensureOriginalsDriveLayout(accessToken: string): Promise<OriginalsDriveLayout> {
  const meta = await getSyncMeta();
  if (meta.originalsFolderId && meta.originalsManifestFileId) {
    const songFolderId = await ensureSubfolder(
      accessToken,
      ENCORE_ORIGINALS_SHARD_SONG_FOLDER,
      meta.originalsFolderId,
    );
    const audioFolderId = await ensureSubfolder(
      accessToken,
      ENCORE_ORIGINALS_AUDIO_FOLDER,
      meta.originalsFolderId,
    );
    const referencesFolderId = await ensureSubfolder(
      accessToken,
      ENCORE_ORIGINALS_REFERENCES_FOLDER,
      meta.originalsFolderId,
    );
    return {
      originalsFolderId: meta.originalsFolderId,
      songFolderId,
      audioFolderId,
      referencesFolderId,
      manifestFileId: meta.originalsManifestFileId,
    };
  }

  const base = await ensureEncoreDriveLayout(accessToken);
  const originalsFolderId = await ensureSubfolder(
    accessToken,
    ENCORE_ORIGINALS_FOLDER,
    base.rootFolderId,
  );
  const [songFolderId, audioFolderId, referencesFolderId] = await Promise.all([
    ensureSubfolder(accessToken, ENCORE_ORIGINALS_SHARD_SONG_FOLDER, originalsFolderId),
    ensureSubfolder(accessToken, ENCORE_ORIGINALS_AUDIO_FOLDER, originalsFolderId),
    ensureSubfolder(accessToken, ENCORE_ORIGINALS_REFERENCES_FOLDER, originalsFolderId),
  ]);

  const manifestList = await driveListFiles(
    accessToken,
    qJsonInParent(ENCORE_ORIGINALS_MANIFEST_FILE, originalsFolderId),
  );
  let manifestFileId = (manifestList.files?.[0] as { id?: string } | undefined)?.id;
  if (!manifestFileId) {
    const created = await driveCreateJsonFile(
      accessToken,
      JSON.stringify(emptyManifest()),
      ENCORE_ORIGINALS_MANIFEST_FILE,
      [originalsFolderId],
    );
    manifestFileId = created.id;
  }

  await patchSyncMeta({
    originalsFolderId,
    originalsManifestFileId: manifestFileId,
  });

  return { originalsFolderId, songFolderId, audioFolderId, referencesFolderId, manifestFileId };
}

async function readManifest(accessToken: string, manifestFileId: string): Promise<OriginalsManifest> {
  const raw = await driveGetMedia(accessToken, manifestFileId);
  if (!raw.trim()) return emptyManifest();
  return parseManifest(raw);
}

async function writeManifest(
  accessToken: string,
  manifestFileId: string,
  manifest: OriginalsManifest,
): Promise<void> {
  await drivePatchJsonMedia(
    accessToken,
    manifestFileId,
    JSON.stringify({ ...manifest, exportedAt: new Date().toISOString() }),
    undefined,
  );
}

function isOriginalDirty(row: DirtySyncRow): boolean {
  return row.kind === 'original';
}

/** Push dirty `original` rows to Drive shards. */
export async function pushOriginalsDirtyShards(accessToken: string): Promise<number> {
  const dirty = (await takeDirtyRows()).filter(isOriginalDirty);
  if (dirty.length === 0) return 0;

  const layout = await ensureOriginalsDriveLayout(accessToken);
  const manifest = await readManifest(accessToken, layout.manifestFileId);
  const drainedIds: string[] = [];

  for (const entry of dirty) {
    if (entry.op === 'delete') {
      const existing = manifest.originals[entry.rowId];
      if (existing?.fileId) {
        try {
          await driveTrashFile(accessToken, existing.fileId);
        } catch {
          /* best-effort */
        }
      }
      delete manifest.originals[entry.rowId];
      drainedIds.push(entry.id);
      continue;
    }
    const row = await encoreDb.originals.get(entry.rowId);
    if (!row) {
      const existing = manifest.originals[entry.rowId];
      if (existing?.fileId) {
        try {
          await driveTrashFile(accessToken, existing.fileId);
        } catch {
          /* ignore */
        }
      }
      delete manifest.originals[entry.rowId];
      drainedIds.push(entry.id);
      continue;
    }
    const body = JSON.stringify(row);
    const existing = manifest.originals[row.id];
    if (existing?.fileId) {
      try {
        await drivePatchJsonMedia(accessToken, existing.fileId, body, undefined);
        manifest.originals[row.id] = { fileId: existing.fileId, updatedAt: row.updatedAt };
      } catch {
        const created = await driveCreateJsonFile(
          accessToken,
          body,
          `${row.id}.json`,
          [layout.songFolderId],
        );
        manifest.originals[row.id] = { fileId: created.id, updatedAt: row.updatedAt };
      }
    } else {
      const created = await driveCreateJsonFile(
        accessToken,
        body,
        `${row.id}.json`,
        [layout.songFolderId],
      );
      manifest.originals[row.id] = { fileId: created.id, updatedAt: row.updatedAt };
    }
    drainedIds.push(entry.id);
  }

  await writeManifest(accessToken, layout.manifestFileId, manifest);
  await clearDirtyRows(drainedIds);

  const fileMeta = await driveGetFileMetadata(accessToken, layout.manifestFileId);
  const localMax = maxOriginalsClock(await encoreDb.originals.toArray());
  await patchSyncMeta({
    originalsManifestRevision: fileMeta.modifiedTime,
    lastSyncedOriginalsMaxUpdatedAt: localMax,
    lastSuccessfulPushAt: new Date().toISOString(),
  });

  return drainedIds.length;
}

/** Incremental pull for originals shards. */
export async function pullChangedOriginalsShards(accessToken: string): Promise<number> {
  const layout = await ensureOriginalsDriveLayout(accessToken);
  const manifest = await readManifest(accessToken, layout.manifestFileId);
  const local = new Map((await encoreDb.originals.toArray()).map((s) => [s.id, s] as const));
  let pulled = 0;

  for (const [id, entry] of Object.entries(manifest.originals)) {
    const localRow = local.get(id);
    // Skip network when local clock wins. Callers that bump `updatedAt` without user content
    // (e.g. remap heals) must use `preserveUpdatedAt` so richer remote shards stay pullable.
    if (localRow && localRow.updatedAt >= entry.updatedAt) continue;
    const raw = await driveGetMedia(accessToken, entry.fileId);
    const remoteRow = normalizeEncoreOriginalSong(
      JSON.parse(raw) as EncoreOriginalSong & {
        tags?: string[];
        status?: string;
        brainstormMarkdown?: string;
      },
    );
    // Content-aware: newer sparse shard must not wipe richer local compound fields (ADR 0019).
    const row = localRow ? mergeOriginalSongPreservingContent(localRow, remoteRow) : remoteRow;
    await encoreDb.originals.put(row);
    // If merge preserved local-only content, push so Drive gets the healed shard.
    if (localRow && JSON.stringify(row) !== JSON.stringify(remoteRow)) {
      await markDirtyRow('original', row.id, 'upsert');
    }
    pulled += 1;
  }

  const manifestIds = new Set(Object.keys(manifest.originals));
  for (const [id] of local) {
    if (!manifestIds.has(id)) {
      await encoreDb.originals.delete(id);
      pulled += 1;
    }
  }

  return pulled;
}
