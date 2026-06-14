import { describe, expect, it } from 'vitest';
import { packNeedsPhotoReindex, pickGesturePackCoverFileIds } from './gesturePackIndex';
import type { GesturePack, GesturePackFile } from '../types';

const basePack: GesturePack = {
  id: 'p1',
  driveFolderId: 'f1',
  name: 'Cats',
  linkedAt: '2026-01-01T00:00:00.000Z',
  lastIndexedAt: '2026-01-01T00:00:00.000Z',
  source: 'upload',
};

describe('packNeedsPhotoReindex', () => {
  it('reindexes empty collections', () => {
    expect(packNeedsPhotoReindex(basePack, 0)).toBe(true);
  });

  it('reindexes partial upload collections below expected total', () => {
    expect(
      packNeedsPhotoReindex(
        { ...basePack, uploadStatus: 'incomplete', expectedFileCount: 400, uploadedFileCount: 58 },
        58,
      ),
    ).toBe(true);
  });

  it('skips healthy collections', () => {
    expect(packNeedsPhotoReindex(basePack, 120)).toBe(false);
    expect(
      packNeedsPhotoReindex(
        { ...basePack, uploadStatus: 'incomplete', expectedFileCount: 400 },
        400,
      ),
    ).toBe(false);
  });
});

describe('pickGesturePackCoverFileIds', () => {
  const files: GesturePackFile[] = [
    { driveFileId: 'c', packId: 'p1', name: 'Charlie.jpg', mimeType: 'image/jpeg' },
    { driveFileId: 'a', packId: 'p1', name: 'Alpha.jpg', mimeType: 'image/jpeg' },
    { driveFileId: 'b', packId: 'p1', name: 'Bravo.jpg', mimeType: 'image/jpeg' },
    { driveFileId: 'd', packId: 'p1', name: 'Delta.jpg', mimeType: 'image/jpeg' },
    { driveFileId: 'e', packId: 'p1', name: 'Echo.jpg', mimeType: 'image/jpeg' },
  ];

  it('returns first four ids sorted by file name', () => {
    expect(pickGesturePackCoverFileIds(files)).toEqual(['a', 'b', 'c', 'd']);
  });
});
