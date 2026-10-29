import { useLiveQuery } from 'dexie-react-hooks';

import { resolveDexieLiveQuery } from '../../shared/dexie/resolveDexieLiveQuery';
import { lyreflyDb } from '../db/lyreflyDb';
import type { LyreflyCollection, LyreflyCollectionMember, LyreflyCollectionPiece } from '../types';

export type LyreflyCollectionsState = {
  collections: LyreflyCollection[];
  /** Live pieces per collection, in collection order. Deleted markers are left out. */
  piecesByCollection: Map<string, LyreflyCollectionPiece[]>;
  /** Live works (notes and comics) per collection, in the order added. */
  membersByCollection: Map<string, LyreflyCollectionMember[]>;
};

const EMPTY: LyreflyCollectionsState = { collections: [], piecesByCollection: new Map(), membersByCollection: new Map() };

export function useLyreflyCollections(): LyreflyCollectionsState & { hydrated: boolean } {
  const raw = useLiveQuery(async (): Promise<LyreflyCollectionsState> => {
    const [collections, pieces, members] = await Promise.all([
      lyreflyDb.collections.toArray(),
      lyreflyDb.collectionPieces.toArray(),
      lyreflyDb.collectionMembers.toArray(),
    ]);
    const membersByCollection = new Map<string, LyreflyCollectionMember[]>();
    for (const member of members) {
      if (member.deletedAt) continue;
      const list = membersByCollection.get(member.collectionId) ?? [];
      list.push(member);
      membersByCollection.set(member.collectionId, list);
    }
    for (const list of membersByCollection.values()) list.sort((a, b) => a.order - b.order);
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
      membersByCollection,
    };
  }, []);
  const { value, hydrated } = resolveDexieLiveQuery(raw, EMPTY);
  return { ...value, hydrated };
}
