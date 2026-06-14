import { describe, expect, it } from 'vitest';
import {
  gestureDuplicateGroupKey,
  groupFolderImagesIntoDuplicates,
  summarizeDuplicateScan,
} from './gestureDuplicateDetection';
import type { GesturePack } from '../types';

const pack: GesturePack = {
  id: 'pack-1',
  driveFolderId: 'folder-1',
  name: 'Cats 1',
  linkedAt: '2026-01-01T00:00:00.000Z',
  lastIndexedAt: '2026-01-01T00:00:00.000Z',
};

describe('gestureDuplicateDetection', () => {
  it('groups same basename duplicates by name when md5 is missing', () => {
    const groups = groupFolderImagesIntoDuplicates(
      pack,
      [
        { id: 'a', name: 'cat.jpg', createdTime: '2026-01-02T00:00:00.000Z' },
        { id: 'b', name: 'cat.jpg', createdTime: '2026-01-03T00:00:00.000Z' },
      ],
      new Set(['a']),
      new Set(),
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.canonicalFileId).toBe('a');
    expect(groups[0]?.fileIdsToTrash).toEqual(['b']);
  });

  it('does not group same name when md5 differs', () => {
    const groups = groupFolderImagesIntoDuplicates(
      pack,
      [
        { id: 'a', name: 'cat.jpg', md5Checksum: 'one', size: '100' },
        { id: 'b', name: 'cat.jpg', md5Checksum: 'two', size: '100' },
      ],
      new Set(),
      new Set(),
    );
    expect(groups).toHaveLength(0);
  });

  it('groups by md5 across different names', () => {
    const key = gestureDuplicateGroupKey({ name: 'a.jpg', md5Checksum: 'same', size: '10' });
    expect(key).toBe(gestureDuplicateGroupKey({ name: 'b.jpg', md5Checksum: 'same', size: '10' }));
  });

  it('summarizes scan counts', () => {
    expect(
      summarizeDuplicateScan({
        groups: [
          {
            packId: 'p',
            packName: 'Cats',
            driveFolderId: 'f',
            key: 'name:cat.jpg',
            canonicalFileId: 'keep',
            members: [],
            fileIdsToTrash: ['x', 'y'],
          },
        ],
        duplicateFileCount: 2,
        collectionCount: 1,
      }),
    ).toBe('2 duplicate photos in 1 collection.');
  });
});
