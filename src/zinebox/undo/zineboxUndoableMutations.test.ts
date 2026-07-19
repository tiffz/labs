import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { zineboxDb } from '../db/zineboxDb';
import {
  listZineboxDeletedStackTombstones,
  listZineboxStackMembershipRemovalTombstones,
  stackMembershipTombstoneId,
} from '../drive/zineboxDriveStackTombstones';
import { listZineboxComicTombstones } from '../drive/zineboxDriveTombstones';
import type { ZineboxCollection, ZineboxComic } from '../types';
import {
  appendComicToStackUndoable,
  createStackFromComicsUndoable,
  deleteZineboxComicUndoable,
  removeComicFromStackUndoable,
} from './zineboxUndoableMutations';

function comic(id: string, title = id): ZineboxComic {
  return {
    id,
    title,
    source: 'local',
    fileId: `file-${id}`,
    coverThumbnailBase64: '',
    readStatus: 'unread',
    progressPercentage: 0,
  };
}

function comicsById(comics: ZineboxComic[]): Map<string, ZineboxComic> {
  return new Map(comics.map((c) => [c.id, c]));
}

describe('zineboxUndoableMutations', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await zineboxDb.comics.clear();
    await zineboxDb.comicFiles.clear();
    await zineboxDb.collections.clear();
  });

  it('delete comic: undo restores rows, memberships, and clears the tombstone', async () => {
    const a = comic('a');
    await zineboxDb.comics.put(a);
    await zineboxDb.comicFiles.put({ comicId: 'a', blob: new Blob(['pdf']) });
    const stack: ZineboxCollection = { id: 'stack-1', name: 'S', itemIds: ['a', 'b', 'c'] };
    await zineboxDb.collections.put(stack);

    const commit = await deleteZineboxComicUndoable('a');
    expect(commit).not.toBeNull();
    expect(await zineboxDb.comics.get('a')).toBeUndefined();
    expect(await zineboxDb.comicFiles.get('a')).toBeUndefined();
    expect(listZineboxComicTombstones().map((t) => t.id)).toContain('a');

    await commit!.undo();
    expect(await zineboxDb.comics.get('a')).toMatchObject({ id: 'a' });
    expect(await zineboxDb.comicFiles.get('a')).toBeDefined();
    expect(listZineboxComicTombstones().map((t) => t.id)).not.toContain('a');
    expect((await zineboxDb.collections.get('stack-1'))?.itemIds).toContain('a');

    await commit!.redo();
    expect(await zineboxDb.comics.get('a')).toBeUndefined();
    expect(listZineboxComicTombstones().map((t) => t.id)).toContain('a');
  });

  it('remove from stack: undo restores the row and clears the membership tombstone', async () => {
    const all = [comic('a'), comic('b'), comic('c')];
    await zineboxDb.comics.bulkPut(all);
    const stack: ZineboxCollection = { id: 'stack-1', name: 'S', itemIds: ['a', 'b', 'c'] };
    await zineboxDb.collections.put(stack);

    const commit = await removeComicFromStackUndoable('stack-1', 'b', comicsById(all));
    expect((await zineboxDb.collections.get('stack-1'))?.itemIds).toEqual(['a', 'c']);
    const membershipId = stackMembershipTombstoneId('stack-1', 'b');
    expect(listZineboxStackMembershipRemovalTombstones().map((t) => t.id)).toContain(membershipId);

    await commit!.undo();
    expect((await zineboxDb.collections.get('stack-1'))?.itemIds).toEqual(['a', 'b', 'c']);
    expect(listZineboxStackMembershipRemovalTombstones().map((t) => t.id)).not.toContain(
      membershipId,
    );
  });

  it('remove from a 2-item stack dissolves it; undo restores the dissolved stack', async () => {
    const all = [comic('a'), comic('b')];
    await zineboxDb.comics.bulkPut(all);
    await zineboxDb.collections.put({ id: 'stack-1', name: 'S', itemIds: ['a', 'b'] });

    const commit = await removeComicFromStackUndoable('stack-1', 'b', comicsById(all));
    expect(await zineboxDb.collections.get('stack-1')).toBeUndefined();
    expect(listZineboxDeletedStackTombstones().map((t) => t.id)).toContain('stack-1');

    await commit!.undo();
    expect((await zineboxDb.collections.get('stack-1'))?.itemIds).toEqual(['a', 'b']);
    expect(listZineboxDeletedStackTombstones().map((t) => t.id)).not.toContain('stack-1');
  });

  it('create stack: undo deletes it with a deletion tombstone; redo restores it', async () => {
    const all = [comic('a'), comic('b')];
    await zineboxDb.comics.bulkPut(all);

    const { collection, commit } = await createStackFromComicsUndoable(all, comicsById(all));
    expect((await zineboxDb.collections.get(collection.id))?.itemIds).toEqual(['a', 'b']);

    await commit.undo();
    expect(await zineboxDb.collections.get(collection.id)).toBeUndefined();
    expect(listZineboxDeletedStackTombstones().map((t) => t.id)).toContain(collection.id);

    await commit.redo();
    expect((await zineboxDb.collections.get(collection.id))?.itemIds).toEqual(['a', 'b']);
    expect(listZineboxDeletedStackTombstones().map((t) => t.id)).not.toContain(collection.id);
  });

  it('append to stack: undo restores the prior members and records a removal tombstone', async () => {
    const all = [comic('a'), comic('b'), comic('c')];
    await zineboxDb.comics.bulkPut(all);
    const stack: ZineboxCollection = { id: 'stack-1', name: 'S', itemIds: ['a', 'b'] };
    await zineboxDb.collections.put(stack);

    const commit = await appendComicToStackUndoable(stack, 'c', comicsById(all));
    expect((await zineboxDb.collections.get('stack-1'))?.itemIds).toContain('c');

    await commit!.undo();
    expect((await zineboxDb.collections.get('stack-1'))?.itemIds).toEqual(['a', 'b']);
    const membershipId = stackMembershipTombstoneId('stack-1', 'c');
    expect(listZineboxStackMembershipRemovalTombstones().map((t) => t.id)).toContain(membershipId);

    await commit!.redo();
    expect((await zineboxDb.collections.get('stack-1'))?.itemIds).toContain('c');
    expect(listZineboxStackMembershipRemovalTombstones().map((t) => t.id)).not.toContain(
      membershipId,
    );
  });
});
