// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';

import { buildLyreflyDriveEnvelope, envelopeToPayload } from '../drive/lyreflyDriveEnvelope';
import { mergeLyreflyCollections, readLyreflyCollectionsLocal } from '../drive/lyreflyCollectionsSync';
import type { LyreflyCollectionMember } from '../types';
import {
  addToLyreflyCollection,
  lyreflyCollectionMemberId,
  removeFromLyreflyCollection,
} from './lyreflyCollectionMutations';
import { lyreflyDb } from './lyreflyDb';

beforeEach(async () => {
  await lyreflyDb.delete();
  await lyreflyDb.open();
});

const live = async () => (await lyreflyDb.collectionMembers.toArray()).filter((m) => !m.deletedAt);

describe('works in collections', () => {
  it('a comic can be in several collections, once each', async () => {
    await addToLyreflyCollection('c1', 'work', 'moon');
    await addToLyreflyCollection('c2', 'work', 'moon');
    await addToLyreflyCollection('c1', 'work', 'moon');
    expect((await live()).map((m) => m.collectionId).sort()).toEqual(['c1', 'c2']);
  });

  it('removing leaves a marker; adding again revives the same row', async () => {
    await addToLyreflyCollection('c1', 'seed', 'note');
    const [member] = await live();
    await removeFromLyreflyCollection(member!);
    expect(await live()).toEqual([]);
    await addToLyreflyCollection('c1', 'seed', 'note');
    expect(await lyreflyDb.collectionMembers.count()).toBe(1);
    expect((await live())[0]?.id).toBe(member!.id);
  });
});

describe('collection members across devices', () => {
  const row = (patch: Partial<LyreflyCollectionMember>): LyreflyCollectionMember => ({
    id: lyreflyCollectionMemberId('c1', 'work', 'moon'),
    collectionId: 'c1',
    kind: 'work',
    refId: 'moon',
    order: 0,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    ...patch,
  });

  it('two devices adding the same work merge to one row', () => {
    const merged = mergeLyreflyCollections(
      { collections: [], pieces: [], members: [row({ updatedAt: '2026-10-02T00:00:00Z' })] },
      { collections: [], pieces: [], members: [row({ updatedAt: '2026-10-03T00:00:00Z' })] },
    );
    expect(merged.members).toHaveLength(1);
  });

  it('the newer of a removal and an add wins', () => {
    const removed = row({ deletedAt: '2026-10-05T00:00:00Z', updatedAt: '2026-10-05T00:00:00Z' });
    const added = row({ updatedAt: '2026-10-04T00:00:00Z' });
    const merged = mergeLyreflyCollections(
      { collections: [], pieces: [], members: [added] },
      { collections: [], pieces: [], members: [removed] },
    );
    expect(merged.members?.[0]?.deletedAt).toBe('2026-10-05T00:00:00Z');
  });

  // Members alone must still be written: the envelope used to keep `collections` only when it had
  // collections or pieces.
  it('reach Drive and come back, even with no collections or pieces on this device', async () => {
    await addToLyreflyCollection('c1', 'work', 'moon');
    const envelope = buildLyreflyDriveEnvelope({ projects: [], collections: await readLyreflyCollectionsLocal() });
    expect(envelopeToPayload(envelope).collections?.members).toHaveLength(1);
  });

  // Backups written before members existed have no `members` key.
  it('an older backup without members keeps this device’s members', () => {
    const merged = mergeLyreflyCollections(
      { collections: [], pieces: [], members: [row({})] },
      { collections: [], pieces: [] },
    );
    expect(merged.members).toHaveLength(1);
  });
});
