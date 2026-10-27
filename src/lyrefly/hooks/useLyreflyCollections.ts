import { useLiveQuery } from 'dexie-react-hooks';

import { resolveDexieLiveQuery } from '../../shared/dexie/resolveDexieLiveQuery';
import { lyreflyDb } from '../db/lyreflyDb';
import type { LyreflyCollection, LyreflyCollectionPiece } from '../types';

export type LyreflyCollectionsState = {
  collections: LyreflyCollection[];
  /** Live pieces per collection, in collection order. Deleted markers are left out. */
  piecesByCollection: Map<string, LyreflyCollectionPiece[]>;
};

const EMPTY: LyreflyCollectionsState = { collections: [], piecesByCollection: new Map() };

export function useLyreflyCollections(): LyreflyCollectionsState & { hydrated: boolean } {
  const raw = useLiveQuery(async (): Promise<LyreflyCollectionsState> => {
    const [collections, pieces] = await Promise.all([
      lyreflyDb.collections.toArray(),
      lyreflyDb.collectionPieces.toArray(),
    ]);
    const piecesByCollection = new Map<string, LyreflyCollectionPiece[]>();
    for (const piece of pieces) {
      if (piece.deletedAt) continue;
      const list = piecesByCollection.get(piece.collectionId) ?? [];
      list.push(piece);
      piecesByCollection.set(piece.collectionId, list);
    }
    for (const list of piecesByCollection.values()) list.sort((a, b) => a.order - b.order);
    return {
      collections: collections.filter((c) => !c.deletedAt).sort((a, b) => a.title.localeCompare(b.title)),
      piecesByCollection,
    };
  }, []);
  const { value, hydrated } = resolveDexieLiveQuery(raw, EMPTY);
  return { ...value, hydrated };
}
