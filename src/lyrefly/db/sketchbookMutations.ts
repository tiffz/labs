import { notifyLyreflyLocalChange } from './lyreflyChangeBus';
import { lyreflyDb, markLyreflyDirtyRow } from './lyreflyDb';
import type { SketchbookAttachment, SketchbookSeed } from '../types';

export function sketchbookBlobIdsForSeed(seed: SketchbookSeed): string[] {
  const ids = new Set<string>([seed.id]);
  for (const attachment of seed.attachments ?? []) {
    if (attachment.kind === 'image' || attachment.kind === 'file') {
      ids.add(attachment.id);
    }
  }
  return [...ids];
}

export async function putSketchbookSeed(
  seed: SketchbookSeed,
  blob?: Blob | null,
  attachmentBlobs?: ReadonlyMap<string, Blob>,
): Promise<void> {
  await lyreflyDb.transaction('rw', [lyreflyDb.sketchbookSeeds, lyreflyDb.sketchbookBlobs], async () => {
    await lyreflyDb.sketchbookSeeds.put(seed);
    if (blob) {
      await lyreflyDb.sketchbookBlobs.put({ seedId: seed.id, blob });
    }
    if (attachmentBlobs) {
      for (const [blobId, attachmentBlob] of attachmentBlobs) {
        await lyreflyDb.sketchbookBlobs.put({ seedId: blobId, blob: attachmentBlob });
      }
    }
  });
  await markLyreflyDirtyRow('sketchbook_seed', seed.id, 'upsert');
  notifyLyreflyLocalChange();
}

export async function updateSketchbookSeed(seed: SketchbookSeed): Promise<SketchbookSeed> {
  const updated: SketchbookSeed = { ...seed, updatedAt: new Date().toISOString() };
  await lyreflyDb.sketchbookSeeds.put(updated);
  await markLyreflyDirtyRow('sketchbook_seed', updated.id, 'upsert');
  notifyLyreflyLocalChange();
  return updated;
}

export async function deleteSketchbookSeed(seed: SketchbookSeed): Promise<void> {
  const blobIds = sketchbookBlobIdsForSeed(seed);
  await lyreflyDb.transaction('rw', [lyreflyDb.sketchbookSeeds, lyreflyDb.sketchbookBlobs], async () => {
    await lyreflyDb.sketchbookSeeds.delete(seed.id);
    await Promise.all(blobIds.map((id) => lyreflyDb.sketchbookBlobs.delete(id)));
  });
  await markLyreflyDirtyRow('sketchbook_seed', seed.id, 'delete');
  notifyLyreflyLocalChange();
}

export async function loadSketchbookBlob(blobId: string): Promise<Blob | null> {
  const row = await lyreflyDb.sketchbookBlobs.get(blobId);
  return row?.blob ?? null;
}

export async function addSketchbookAttachment(
  seed: SketchbookSeed,
  attachment: SketchbookAttachment,
  blob?: Blob | null,
): Promise<SketchbookSeed> {
  const updated: SketchbookSeed = {
    ...seed,
    attachments: [...(seed.attachments ?? []), attachment],
    updatedAt: new Date().toISOString(),
  };
  await putSketchbookSeed(
    updated,
    null,
    blob ? new Map([[attachment.id, blob]]) : undefined,
  );
  return updated;
}

export async function removeSketchbookAttachment(
  seed: SketchbookSeed,
  attachmentId: string,
): Promise<SketchbookSeed> {
  const updated: SketchbookSeed = {
    ...seed,
    attachments: (seed.attachments ?? []).filter((item) => item.id !== attachmentId),
    updatedAt: new Date().toISOString(),
  };
  await lyreflyDb.transaction('rw', [lyreflyDb.sketchbookSeeds, lyreflyDb.sketchbookBlobs], async () => {
    await lyreflyDb.sketchbookSeeds.put(updated);
    await lyreflyDb.sketchbookBlobs.delete(attachmentId);
  });
  await markLyreflyDirtyRow('sketchbook_seed', updated.id, 'upsert');
  notifyLyreflyLocalChange();
  return updated;
}

/** Bulk-inserts imported seeds in one transaction with a single change notification. */
export async function putSketchbookSeeds(seeds: SketchbookSeed[]): Promise<void> {
  if (seeds.length === 0) return;
  await lyreflyDb.sketchbookSeeds.bulkPut(seeds);
  for (const seed of seeds) {
    await markLyreflyDirtyRow('sketchbook_seed', seed.id, 'upsert');
  }
  notifyLyreflyLocalChange();
}
