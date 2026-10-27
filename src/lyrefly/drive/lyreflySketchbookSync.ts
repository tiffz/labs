/**
 * Sketchbook sync: seed rows ride in the gallery envelope (`sketchbook`), their images and files
 * live under `Lyrefly/sketchbook/` on Drive.
 *
 * Before this existed, seeds were marked dirty but nothing uploaded them: ideas never left the
 * browser they were typed in. Deletes are rows too (see `sketchbookDeletionMarker`), so the newer
 * of an edit and a delete wins with no separate tombstone list.
 */
import {
  driveGetMediaArrayBuffer,
  driveUploadFileResumable,
} from '../../shared/drive/driveFetch';
import { lyreflyDb } from '../db/lyreflyDb';
import { sketchbookBlobIdsForSeed } from '../db/sketchbookMutations';
import type { SketchbookAttachment, SketchbookSeed } from '../types';

/**
 * Per-field merge disposition. A new SketchbookSeed field is a compile error until it gets one
 * here (ADR 0019): the bug this prevents is a field that round-trips and is silently dropped.
 */
type MergePolicy = 'lww' | 'union-by-id' | 'union-map' | 'union-set';

const SEED_MERGE_POLICY = {
  id: 'lww',
  kind: 'lww',
  title: 'lww',
  logline: 'lww',
  bodyHtml: 'lww',
  occurredOn: 'lww',
  url: 'lww',
  fileName: 'lww',
  mimeType: 'lww',
  attachments: 'union-by-id',
  tags: 'lww',
  status: 'lww',
  promotedProjectId: 'lww',
  sortOrder: 'lww',
  deletedAt: 'lww',
  blobDriveFileIds: 'union-map',
  removedAttachmentIds: 'union-set',
  createdAt: 'lww',
  updatedAt: 'lww',
} satisfies Record<keyof SketchbookSeed, MergePolicy>;

function mergeSeed(local: SketchbookSeed, remote: SketchbookSeed): SketchbookSeed {
  const newer = remote.updatedAt > local.updatedAt ? remote : local;
  // A newer delete takes the whole row: unions must not refill a deleted idea.
  if (newer.deletedAt) return newer;
  const older = newer === local ? remote : local;

  const removed = [...new Set([...(local.removedAttachmentIds ?? []), ...(remote.removedAttachmentIds ?? [])])];
  const merged = {} as Record<keyof SketchbookSeed, unknown>;
  for (const key of Object.keys(SEED_MERGE_POLICY) as (keyof SketchbookSeed)[]) {
    const policy: MergePolicy = SEED_MERGE_POLICY[key];
    if (policy === 'lww') {
      if (key in newer) merged[key] = newer[key];
    } else if (policy === 'union-by-id') {
      const byId = new Map<string, SketchbookAttachment>();
      for (const a of [...(older.attachments ?? []), ...(newer.attachments ?? [])]) byId.set(a.id, a);
      const kept = [...byId.values()].filter((a) => !removed.includes(a.id));
      if (kept.length > 0 || newer.attachments) merged.attachments = kept;
    } else if (policy === 'union-map') {
      const map = { ...older.blobDriveFileIds, ...newer.blobDriveFileIds };
      if (Object.keys(map).length > 0) merged.blobDriveFileIds = map;
    } else if (removed.length > 0) {
      merged.removedAttachmentIds = removed;
    }
  }
  // Reaching here, the newer side is not deleted, so an older delete gives way to the later edit.
  return merged as unknown as SketchbookSeed;
}

export function mergeLyreflySketchbook(
  local: readonly SketchbookSeed[] | undefined,
  remote: readonly SketchbookSeed[] | undefined,
): SketchbookSeed[] {
  const byId = new Map((local ?? []).map((s) => [s.id, s] as const));
  for (const seed of remote ?? []) {
    const prev = byId.get(seed.id);
    byId.set(seed.id, prev ? mergeSeed(prev, seed) : seed);
  }
  return [...byId.values()];
}

/** Write merged seeds over local rows that are older; drop the blobs of seeds now deleted. */
export async function writeLyreflySketchbookLocal(seeds: readonly SketchbookSeed[]): Promise<void> {
  await lyreflyDb.transaction('rw', [lyreflyDb.sketchbookSeeds, lyreflyDb.sketchbookBlobs], async () => {
    for (const seed of seeds) {
      const current = await lyreflyDb.sketchbookSeeds.get(seed.id);
      if (current && seed.updatedAt <= current.updatedAt) {
        // Same or older: only learn Drive ids this device lacks (they do not bump updatedAt).
        const ids = { ...seed.blobDriveFileIds, ...current.blobDriveFileIds };
        if (Object.keys(ids).length !== Object.keys(current.blobDriveFileIds ?? {}).length) {
          await lyreflyDb.sketchbookSeeds.put({ ...current, blobDriveFileIds: ids });
        }
        continue;
      }
      await lyreflyDb.sketchbookSeeds.put(seed);
      if (seed.deletedAt && current) {
        await Promise.all(sketchbookBlobIdsForSeed(current).map((id) => lyreflyDb.sketchbookBlobs.delete(id)));
      }
    }
  });
}

const SKETCHBOOK_FOLDER = 'sketchbook';

/**
 * Upload every seed blob Drive does not have yet. Runs before the envelope is written, so the
 * envelope never names a Drive file that is not there.
 */
export async function uploadLyreflySketchbookBlobs(
  accessToken: string,
  resolveFolder: (name: string) => Promise<string>,
  onLabel: (label: string) => void,
): Promise<void> {
  const seeds = (await lyreflyDb.sketchbookSeeds.toArray()).filter((s) => !s.deletedAt);
  let folderId: string | null = null;
  for (const seed of seeds) {
    const known = seed.blobDriveFileIds ?? {};
    const added: Record<string, string> = {};
    for (const blobId of sketchbookBlobIdsForSeed(seed)) {
      if (known[blobId]) continue;
      const row = await lyreflyDb.sketchbookBlobs.get(blobId);
      if (!row?.blob || row.blob.size === 0) continue;
      folderId ??= await resolveFolder(SKETCHBOOK_FOLDER);
      onLabel(`Uploading sketchbook: ${seed.title ?? 'idea'}`);
      const name = `${blobId}-${(row.blob as File).name ?? 'file'}`;
      const file = new File([row.blob], name, { type: row.blob.type || 'application/octet-stream' });
      const { id } = await driveUploadFileResumable(accessToken, file, [folderId], name);
      added[blobId] = id;
    }
    if (Object.keys(added).length > 0) {
      // Re-read: the seed may have been edited while the upload ran.
      const fresh = await lyreflyDb.sketchbookSeeds.get(seed.id);
      if (fresh) await lyreflyDb.sketchbookSeeds.put({ ...fresh, blobDriveFileIds: { ...fresh.blobDriveFileIds, ...added } });
    }
  }
}

/** Download seed blobs this device is missing. A failure is retried next sync, never recorded as data. */
export async function downloadMissingLyreflySketchbookBlobs(
  accessToken: string,
  onLabel: (label: string) => void,
): Promise<void> {
  const seeds = (await lyreflyDb.sketchbookSeeds.toArray()).filter((s) => !s.deletedAt);
  for (const seed of seeds) {
    for (const [blobId, driveFileId] of Object.entries(seed.blobDriveFileIds ?? {})) {
      const existing = await lyreflyDb.sketchbookBlobs.get(blobId);
      if (existing?.blob && existing.blob.size > 0) continue;
      onLabel(`Downloading sketchbook: ${seed.title ?? 'idea'}`);
      try {
        const bytes = await driveGetMediaArrayBuffer(accessToken, driveFileId);
        const attachment = seed.attachments?.find((a) => a.id === blobId);
        const type = (blobId === seed.id ? seed.mimeType : attachment?.mimeType) ?? 'application/octet-stream';
        await lyreflyDb.sketchbookBlobs.put({ seedId: blobId, blob: new Blob([bytes], { type }) });
      } catch (error) {
        console.warn(`[lyrefly-drive] sketchbook blob ${blobId} not downloaded; will retry`, error);
      }
    }
  }
}
