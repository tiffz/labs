import { describe, expect, it } from 'vitest';
import {
  dedupeUnlinkedPackFolders,
  filterUnlinkedPackFolders,
  isActiveDriveFolder,
} from './gestureDiscoverUnlinkedPacks';
import type { GesturePack } from '../types';

const pack = (driveFolderId: string): GesturePack => ({
  id: `id-${driveFolderId}`,
  driveFolderId,
  name: 'Linked',
  linkedAt: '2026-01-01T00:00:00.000Z',
  lastIndexedAt: '2026-01-01T00:00:00.000Z',
});

describe('gestureDiscoverUnlinkedPacks', () => {
  it('dedupes folders by driveFolderId', () => {
    const result = dedupeUnlinkedPackFolders([
      { driveFolderId: 'a', name: 'First' },
      { driveFolderId: 'a', name: 'Second' },
      { driveFolderId: 'b', name: 'Other' },
    ]);
    expect(result).toHaveLength(2);
    expect(result.find((f) => f.driveFolderId === 'a')?.name).toBe('Second');
  });

  it('filters folders already linked in Dexie', () => {
    const result = filterUnlinkedPackFolders(
      [
        { driveFolderId: 'known', name: 'Known' },
        { driveFolderId: 'new', name: 'New pack' },
      ],
      [pack('known')],
    );
    expect(result).toEqual([{ driveFolderId: 'new', name: 'New pack' }]);
  });

  it('rejects trashed Drive folders', () => {
    expect(isActiveDriveFolder({ trashed: true, mimeType: 'application/vnd.google-apps.folder' })).toBe(
      false,
    );
    expect(isActiveDriveFolder({ trashed: false, mimeType: 'application/vnd.google-apps.folder' })).toBe(
      true,
    );
  });
});
