import { describe, expect, it } from 'vitest';
import type { ZineboxComic } from '../types';
import { mergeZineboxSyncPayload } from './zineboxDriveMerge';

function comic(id: string, overrides: Partial<ZineboxComic> = {}): ZineboxComic {
  return {
    id,
    title: `Comic ${id}`,
    source: 'Local',
    fileId: id,
    coverThumbnailBase64: 'data:image/png;base64,',
    readStatus: 'unread',
    progressPercentage: 0,
    ...overrides,
  };
}

describe('mergeZineboxSyncPayload', () => {
  it('keeps higher reading progress when merging the same comic', () => {
    const local = {
      comics: [comic('a', { progressPercentage: 80, readStatus: 'in_progress' })],
      collections: [],
    };
    const remote = {
      comics: [comic('a', { progressPercentage: 20, readStatus: 'unread' })],
      collections: [],
    };
    const { payload, report } = mergeZineboxSyncPayload(local, remote);
    expect(payload.comics).toHaveLength(1);
    expect(payload.comics[0]?.progressPercentage).toBe(80);
    expect(payload.comics[0]?.readStatus).toBe('in_progress');
    expect(report.comicsMerged).toBe(1);
  });

  it('unions comics and stacks from both sides', () => {
    const local = {
      comics: [comic('local-only')],
      collections: [{ id: 's1', name: 'Local stack', itemIds: ['local-only'] }],
    };
    const remote = {
      comics: [comic('remote-only', { driveBackupFileId: 'drive-1' })],
      collections: [{ id: 's2', name: 'Remote stack', itemIds: ['remote-only'] }],
    };
    const { payload, report } = mergeZineboxSyncPayload(local, remote);
    expect(payload.comics.map((c) => c.id).sort()).toEqual(['local-only', 'remote-only']);
    expect(payload.collections).toHaveLength(2);
    expect(report.comicsFromLocalOnly).toBe(1);
    expect(report.comicsFromRemoteOnly).toBe(1);
  });
});
