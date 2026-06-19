import { describe, expect, it } from 'vitest';
import type { ZineboxComic } from '../types';
import {
  formatZineboxDriveMergeReport,
  mergeZineboxSyncPayload,
  zineboxMergeReportHasUserVisibleRemoteChanges,
} from './zineboxDriveMerge';

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
    expect(report.comicsUpdatedFromRemote).toBe(0);
  });

  it('counts remote progress updates without implying every overlap was edited', () => {
    const local = {
      comics: [comic('a', { progressPercentage: 20, readStatus: 'unread' })],
      collections: [],
    };
    const remote = {
      comics: [comic('a', { progressPercentage: 80, readStatus: 'in_progress' })],
      collections: [],
    };
    const { payload, report } = mergeZineboxSyncPayload(local, remote);
    expect(payload.comics[0]?.progressPercentage).toBe(80);
    expect(report.comicsUpdatedFromRemote).toBe(1);
    expect(formatZineboxDriveMergeReport(report)).toBe('updated 1 comic from Drive');
    expect(zineboxMergeReportHasUserVisibleRemoteChanges(report)).toBe(true);
  });

  it('reports already in sync when overlap is unchanged', () => {
    const shared = comic('a', { progressPercentage: 50, readStatus: 'in_progress' });
    const local = { comics: [shared], collections: [] };
    const remote = { comics: [shared], collections: [] };
    const { report } = mergeZineboxSyncPayload(local, remote);
    expect(report.comicsMerged).toBe(1);
    expect(report.comicsUpdatedFromRemote).toBe(0);
    expect(formatZineboxDriveMergeReport(report)).toBe('already in sync');
    expect(zineboxMergeReportHasUserVisibleRemoteChanges(report)).toBe(false);
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

  it('drops tombstoned comics from union merge', () => {
    const local = {
      comics: [],
      collections: [{ id: 's1', name: 'Stack', itemIds: ['deleted-comic'] }],
    };
    const remote = {
      comics: [comic('deleted-comic', { driveBackupFileId: 'drive-1' })],
      collections: [],
    };
    const { payload } = mergeZineboxSyncPayload(local, remote, {
      tombstoneComicIds: new Set(['deleted-comic']),
    });
    expect(payload.comics).toHaveLength(0);
    expect(payload.collections.find((c) => c.id === 's1')).toBeUndefined();
  });

  it('respects stack membership removal tombstones during union merge', () => {
    const local = {
      comics: [comic('a'), comic('b'), comic('c')],
      collections: [{ id: 'stack-1', name: 'Series', itemIds: ['a', 'b'] }],
    };
    const remote = {
      comics: [comic('a'), comic('b'), comic('c')],
      collections: [{ id: 'stack-1', name: 'Series', itemIds: ['a', 'b', 'c'] }],
    };
    const { payload } = mergeZineboxSyncPayload(local, remote, {
      removedStackMemberships: new Set(['stack-1::c']),
    });
    const stack = payload.collections.find((c) => c.id === 'stack-1');
    expect(stack?.itemIds.sort()).toEqual(['a', 'b']);
  });

  it('does not resurrect dissolved stacks from Drive', () => {
    const local = {
      comics: [comic('a'), comic('b')],
      collections: [],
    };
    const remote = {
      comics: [comic('a'), comic('b')],
      collections: [{ id: 'stack-1', name: 'Series', itemIds: ['a', 'b'] }],
    };
    const { payload } = mergeZineboxSyncPayload(local, remote, {
      deletedStackIds: new Set(['stack-1']),
    });
    expect(payload.collections).toHaveLength(0);
  });
});
