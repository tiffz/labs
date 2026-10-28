/**
 * Collections and their pieces ride in the gallery envelope (`collections`). The images are the
 * owner's own Drive files, referenced by id; nothing here uploads, copies or trashes them.
 *
 * A delete leaves a marker row (`deletedAt`), so the newer of a delete and an edit wins with no
 * separate tombstone list, as in the Sketchbook.
 */
import { lyreflyDb } from '../db/lyreflyDb';
import type { LyreflyCollection, LyreflyCollectionPiece } from '../types';

/** A new field is a compile error until it gets a disposition here (ADR 0019). */
type MergePolicy = 'lww' | 'union-set';

const COLLECTION_MERGE_POLICY = {
  id: 'lww',
  title: 'lww',
  notes: 'lww',
  status: 'lww',
  sourceUrl: 'lww',
  createdAt: 'lww',
  updatedAt: 'lww',
  deletedAt: 'lww',
} satisfies Record<keyof LyreflyCollection, MergePolicy>;

const PIECE_MERGE_POLICY = {
  id: 'lww',
  collectionId: 'lww',
  title: 'lww',
  occurredOn: 'lww',
  notes: 'lww',
  driveFileId: 'lww',
  fileName: 'lww',
  mimeType: 'lww',
  sourceUrl: 'lww',
  order: 'lww',
  usedInProjectIds: 'union-set',
  createdAt: 'lww',
  updatedAt: 'lww',
  deletedAt: 'lww',
} satisfies Record<keyof LyreflyCollectionPiece, MergePolicy>;

type Row = { id: string; updatedAt: string; deletedAt?: string };

function mergeRow<T extends Row>(policy: Record<keyof T, MergePolicy>, local: T, remote: T): T {
  const newer = remote.updatedAt > local.updatedAt ? remote : local;
  if (newer.deletedAt) return newer; // a newer delete is final; unions must not refill it
  const older = newer === local ? remote : local;
  const merged = {} as Record<keyof T, unknown>;
  for (const key of Object.keys(policy) as (keyof T)[]) {
    if (policy[key] === 'lww') {
      if (key in newer) merged[key] = newer[key];
    } else {
      const set = [...new Set([...((older[key] as string[] | undefined) ?? []), ...((newer[key] as string[] | undefined) ?? [])])];
      if (set.length > 0) merged[key] = set;
    }
  }
  return merged as T;
}

function mergeRows<T extends Row>(policy: Record<keyof T, MergePolicy>, local: readonly T[], remote: readonly T[]): T[] {
  const byId = new Map(local.map((r) => [r.id, r] as const));
  for (const row of remote) {
    const prev = byId.get(row.id);
    byId.set(row.id, prev ? mergeRow(policy, prev, row) : row);
  }
  return [...byId.values()];
}

export type LyreflyCollectionsPayload = {
  collections: LyreflyCollection[];
  pieces: LyreflyCollectionPiece[];
};

export function mergeLyreflyCollections(
  local: LyreflyCollectionsPayload | undefined,
  remote: LyreflyCollectionsPayload | undefined,
): LyreflyCollectionsPayload {
  return {
    collections: mergeRows(COLLECTION_MERGE_POLICY, local?.collections ?? [], remote?.collections ?? []),
    pieces: mergeRows(PIECE_MERGE_POLICY, local?.pieces ?? [], remote?.pieces ?? []),
  };
}

export async function readLyreflyCollectionsLocal(): Promise<LyreflyCollectionsPayload> {
  const [collections, pieces] = await Promise.all([
    lyreflyDb.collections.toArray(),
    lyreflyDb.collectionPieces.toArray(),
  ]);
  return { collections, pieces };
}

/**
 * Write merged rows over local rows that are older. The payload was read before the Drive fetch,
 * so an edit made while the sync ran is newer and must survive the write-back.
 */
export async function writeLyreflyCollectionsLocal(payload: LyreflyCollectionsPayload): Promise<void> {
  await lyreflyDb.transaction('rw', [lyreflyDb.collections, lyreflyDb.collectionPieces], async () => {
    for (const row of payload.collections) {
      const current = await lyreflyDb.collections.get(row.id);
      if (!current || row.updatedAt > current.updatedAt) await lyreflyDb.collections.put(row);
    }
    for (const row of payload.pieces) {
      const current = await lyreflyDb.collectionPieces.get(row.id);
      if (!current || row.updatedAt > current.updatedAt) await lyreflyDb.collectionPieces.put(row);
    }
  });
}
