/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./bootstrapFolders', () => ({
  ensureEncoreDriveLayout: vi.fn(),
}));
vi.mock('../db/encoreDb', () => ({
  encoreDb: {
    repertoireExtras: {
      get: vi.fn(),
      put: vi.fn(),
    },
  },
  markDirtyRow: vi.fn(),
}));
vi.mock('./performanceShortcut', () => ({
  reorganizeAllPerformanceVideos: vi.fn(),
}));
vi.mock('./songAttachmentOrganize', () => ({
  reorganizeAllSongAttachments: vi.fn(),
}));
vi.mock('./driveDuplicateDetection', () => ({
  scanEncoreDriveDuplicateUploads: vi.fn(async () => ({ refs: [], groups: [], contentIndex: {} })),
}));
vi.mock('./driveDuplicateDedup', () => ({
  applyEncoreDriveDuplicateDedup: vi.fn(),
}));

import { encoreDb } from '../db/encoreDb';
import { ensureEncoreDriveLayout } from './bootstrapFolders';
import { reorganizeAllPerformanceVideos } from './performanceShortcut';
import { reorganizeAllSongAttachments } from './songAttachmentOrganize';
import { reorganizeAllDriveUploads } from './driveReorganize';

beforeEach(() => {
  vi.clearAllMocks();
  (encoreDb.repertoireExtras.get as any).mockResolvedValue({
    id: 'default',
    driveUploadFolderOverrides: { takes: 'custom-takes' },
    updatedAt: new Date().toISOString(),
  });
});

describe('reorganizeAllDriveUploads', () => {
  it('ensures the Drive layout exists before reorganizing, then runs both reorganizers in parallel', async () => {
    let layoutResolved = false;
    let perfStartedAfterLayout = false;
    let attStartedAfterLayout = false;

    (ensureEncoreDriveLayout as any).mockImplementation(async () => {
      await Promise.resolve();
      layoutResolved = true;
    });
    (reorganizeAllPerformanceVideos as any).mockImplementation(async () => {
      perfStartedAfterLayout = layoutResolved;
      return { renamed: 2, skipped: 1, errors: 0, shortcutsCreated: 1 };
    });
    (reorganizeAllSongAttachments as any).mockImplementation(async () => {
      attStartedAfterLayout = layoutResolved;
      return { renamed: 3, moved: 2, skipped: 0, errors: 0, shortcutsCreated: 0 };
    });

    const result = await reorganizeAllDriveUploads('tok');

    expect(ensureEncoreDriveLayout).toHaveBeenCalledWith('tok');
    expect(reorganizeAllPerformanceVideos).toHaveBeenCalledWith('tok', { takes: 'custom-takes' });
    expect(reorganizeAllSongAttachments).toHaveBeenCalledWith('tok', { takes: 'custom-takes' });
    expect(perfStartedAfterLayout).toBe(true);
    expect(attStartedAfterLayout).toBe(true);
    expect(result).toEqual({
      performanceVideos: { renamed: 2, skipped: 1, errors: 0, shortcutsCreated: 1 },
      attachments: { renamed: 3, moved: 2, skipped: 0, errors: 0, shortcutsCreated: 0 },
      dedup: null,
      duplicateGroupsForReview: [],
    });
  });

  it('deduplicates before reorganizing when duplicate groups exist', async () => {
    const { scanEncoreDriveDuplicateUploads } = await import('./driveDuplicateDetection');
    const { applyEncoreDriveDuplicateDedup } = await import('./driveDuplicateDedup');
    const reviewGroup = {
      key: 'md5:abc',
      members: [],
      fileIdsToTrash: [],
      canonicalMediaFileId: 'a',
      canonicalFileId: 'a',
    };
    (scanEncoreDriveDuplicateUploads as any).mockResolvedValueOnce({
      refs: [],
      groups: [reviewGroup],
      contentIndex: {},
    });
    (applyEncoreDriveDuplicateDedup as any).mockResolvedValueOnce({
      songsUpdated: 1,
      performancesUpdated: 0,
      trashed: 2,
      trashErrors: 0,
    });
    (ensureEncoreDriveLayout as any).mockResolvedValue(undefined);
    (reorganizeAllPerformanceVideos as any).mockResolvedValue({
      renamed: 0,
      skipped: 0,
      errors: 0,
      shortcutsCreated: 0,
    });
    (reorganizeAllSongAttachments as any).mockResolvedValue({
      renamed: 0,
      moved: 0,
      skipped: 0,
      errors: 0,
      shortcutsCreated: 0,
    });

    const result = await reorganizeAllDriveUploads('tok');

    expect(applyEncoreDriveDuplicateDedup).toHaveBeenCalledBefore(ensureEncoreDriveLayout as any);
    expect(result.dedup).toEqual({
      songsUpdated: 1,
      performancesUpdated: 0,
      trashed: 2,
      trashErrors: 0,
      duplicateGroups: 1,
    });
    expect(result.duplicateGroupsForReview).toEqual([reviewGroup]);
  });

  it('propagates ensureEncoreDriveLayout failure without invoking the reorganizers', async () => {
    (ensureEncoreDriveLayout as any).mockRejectedValueOnce(new Error('not signed in'));
    await expect(reorganizeAllDriveUploads('tok')).rejects.toThrow('not signed in');
    expect(reorganizeAllPerformanceVideos).not.toHaveBeenCalled();
    expect(reorganizeAllSongAttachments).not.toHaveBeenCalled();
  });
});
