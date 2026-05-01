/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./bootstrapFolders', () => ({
  ensureEncoreDriveLayout: vi.fn(),
}));
vi.mock('./performanceShortcut', () => ({
  reorganizeAllPerformanceVideos: vi.fn(),
}));
vi.mock('./songAttachmentOrganize', () => ({
  reorganizeAllSongAttachments: vi.fn(),
}));

import { ensureEncoreDriveLayout } from './bootstrapFolders';
import { reorganizeAllPerformanceVideos } from './performanceShortcut';
import { reorganizeAllSongAttachments } from './songAttachmentOrganize';
import { reorganizeAllDriveUploads } from './driveReorganize';

beforeEach(() => {
  vi.clearAllMocks();
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
      return { renamed: 3, moved: 2, skipped: 0, errors: 0 };
    });

    const result = await reorganizeAllDriveUploads('tok');

    expect(ensureEncoreDriveLayout).toHaveBeenCalledWith('tok');
    expect(perfStartedAfterLayout).toBe(true);
    expect(attStartedAfterLayout).toBe(true);
    expect(result).toEqual({
      performanceVideos: { renamed: 2, skipped: 1, errors: 0, shortcutsCreated: 1 },
      attachments: { renamed: 3, moved: 2, skipped: 0, errors: 0 },
    });
  });

  it('propagates ensureEncoreDriveLayout failure without invoking the reorganizers', async () => {
    (ensureEncoreDriveLayout as any).mockRejectedValueOnce(new Error('not signed in'));
    await expect(reorganizeAllDriveUploads('tok')).rejects.toThrow('not signed in');
    expect(reorganizeAllPerformanceVideos).not.toHaveBeenCalled();
    expect(reorganizeAllSongAttachments).not.toHaveBeenCalled();
  });
});
