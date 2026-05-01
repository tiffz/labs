/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EncorePerformance, EncoreSong } from '../types';

vi.mock('./driveFetch', () => ({
  driveCreateShortcut: vi.fn(),
  driveGetFileMetadata: vi.fn(),
  driveRenameFile: vi.fn(),
}));

vi.mock('../db/encoreDb', () => ({
  encoreDb: {
    performances: { toArray: vi.fn(), put: vi.fn() },
    songs: { toArray: vi.fn() },
  },
  getSyncMeta: vi.fn(),
}));

import {
  driveCreateShortcut,
  driveGetFileMetadata,
  driveRenameFile,
} from './driveFetch';
import { encoreDb, getSyncMeta } from '../db/encoreDb';
import {
  reorganizeAllPerformanceVideos,
  syncPerformanceVideo,
} from './performanceShortcut';

const PERF_FOLDER = 'perfFolder';

function perf(over: Partial<EncorePerformance> = {}): EncorePerformance {
  const now = new Date().toISOString();
  return {
    id: 'p1',
    songId: 's1',
    date: '2025-08-15',
    venueTag: 'Open Mic',
    notes: '',
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

function song(over: Partial<EncoreSong> = {}): EncoreSong {
  const now = new Date().toISOString();
  return {
    id: 's1',
    title: 'Hey Jude',
    artist: 'The Beatles',
    journalMarkdown: '',
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (getSyncMeta as any).mockResolvedValue({ id: 'default', performancesFolderId: PERF_FOLDER });
});

describe('syncPerformanceVideo', () => {
  it('returns no-op when Drive folder is missing', async () => {
    (getSyncMeta as any).mockResolvedValueOnce({ id: 'default' });
    const result = await syncPerformanceVideo('tok', perf(), song());
    expect(result).toEqual({ renamed: false });
    expect(driveGetFileMetadata).not.toHaveBeenCalled();
  });

  it('creates a shortcut when target lives outside Performances and no shortcut exists', async () => {
    const targetId = 'target-1';
    (driveGetFileMetadata as any)
      // initial target metadata
      .mockResolvedValueOnce({ id: targetId, name: 'orig.mp4', parents: ['some-other-folder'] })
      // shortcut metadata after creation (lives in performances folder, name matches canonical)
      .mockResolvedValueOnce({
        id: 'newShortcut',
        name: '2025-08-15 - Hey Jude - The Beatles',
        parents: [PERF_FOLDER],
      });
    (driveCreateShortcut as any).mockResolvedValueOnce({ id: 'newShortcut' });

    const result = await syncPerformanceVideo(
      'tok',
      perf({ videoTargetDriveFileId: targetId }),
      song(),
    );
    expect(driveCreateShortcut).toHaveBeenCalledWith(
      'tok',
      '2025-08-15 - Hey Jude - The Beatles',
      PERF_FOLDER,
      targetId,
    );
    expect(result.shortcutCreatedId).toBe('newShortcut');
    expect(driveRenameFile).not.toHaveBeenCalled();
    expect(result.renamed).toBe(false);
  });

  it('renames an existing shortcut when its name has drifted', async () => {
    (driveGetFileMetadata as any).mockResolvedValueOnce({
      id: 'sc1',
      name: '2024-12-31 - Old Title - Old Venue',
      parents: [PERF_FOLDER],
    });
    (driveRenameFile as any).mockResolvedValueOnce(undefined);

    const result = await syncPerformanceVideo(
      'tok',
      perf({ videoShortcutDriveFileId: 'sc1' }),
      song(),
    );
    expect(driveRenameFile).toHaveBeenCalledWith('tok', 'sc1', '2025-08-15 - Hey Jude - The Beatles');
    expect(result.renamed).toBe(true);
  });

  it('does not rename when the shortcut already has the canonical name', async () => {
    (driveGetFileMetadata as any).mockResolvedValueOnce({
      id: 'sc1',
      name: '2025-08-15 - Hey Jude - The Beatles',
      parents: [PERF_FOLDER],
    });
    const result = await syncPerformanceVideo(
      'tok',
      perf({ videoShortcutDriveFileId: 'sc1' }),
      song(),
    );
    expect(driveRenameFile).not.toHaveBeenCalled();
    expect(result.renamed).toBe(false);
  });

  it('renames the actual file (not a shortcut) when target lives inside Performances folder', async () => {
    const targetId = 'tgt-in';
    (driveGetFileMetadata as any).mockResolvedValueOnce({
      id: targetId,
      name: 'old-name.mp4',
      parents: [PERF_FOLDER],
    });
    const result = await syncPerformanceVideo(
      'tok',
      perf({ videoTargetDriveFileId: targetId }),
      song(),
    );
    expect(driveCreateShortcut).not.toHaveBeenCalled();
    expect(driveRenameFile).toHaveBeenCalledWith(
      'tok',
      targetId,
      '2025-08-15 - Hey Jude - The Beatles.mp4',
    );
    expect(result.renamed).toBe(true);
  });

  it('swallows shortcut-create errors and continues', async () => {
    const targetId = 'targetX';
    (driveGetFileMetadata as any).mockResolvedValueOnce({
      id: targetId,
      name: 'orig.mp4',
      parents: ['outside'],
    });
    (driveCreateShortcut as any).mockRejectedValueOnce(new Error('drive 500'));
    const result = await syncPerformanceVideo(
      'tok',
      perf({ videoTargetDriveFileId: targetId }),
      song(),
    );
    expect(result.shortcutCreatedId).toBeUndefined();
    expect(result.renamed).toBe(false);
  });

  it('uses Undated when performance.date is not YYYY-MM-DD', async () => {
    (driveGetFileMetadata as any).mockResolvedValueOnce({
      id: 'sc1',
      name: 'wrong',
      parents: [PERF_FOLDER],
    });
    await syncPerformanceVideo(
      'tok',
      perf({ videoShortcutDriveFileId: 'sc1', date: 'sometime' }),
      song(),
    );
    expect(driveRenameFile).toHaveBeenCalledWith(
      'tok',
      'sc1',
      'Undated - Hey Jude - The Beatles',
    );
  });

  it('omits the venue segment when venueTag is empty or "Venue"', async () => {
    (driveGetFileMetadata as any).mockResolvedValueOnce({
      id: 'sc1',
      name: 'wrong',
      parents: [PERF_FOLDER],
    });
    await syncPerformanceVideo(
      'tok',
      perf({ videoShortcutDriveFileId: 'sc1', venueTag: 'Venue' }),
      song(),
    );
    expect(driveRenameFile).toHaveBeenCalledWith('tok', 'sc1', '2025-08-15 - Hey Jude - The Beatles');
  });
});

describe('reorganizeAllPerformanceVideos', () => {
  it('skips performances with no Drive video data', async () => {
    (encoreDb.performances.toArray as any).mockResolvedValueOnce([perf({ id: 'pX' })]);
    (encoreDb.songs.toArray as any).mockResolvedValueOnce([song()]);
    const r = await reorganizeAllPerformanceVideos('tok');
    expect(r).toEqual({ renamed: 0, skipped: 1, errors: 0, shortcutsCreated: 0 });
    expect(driveGetFileMetadata).not.toHaveBeenCalled();
  });

  it('counts renames and persists newly created shortcut ids back to the DB', async () => {
    const p1 = perf({ id: 'p1', videoTargetDriveFileId: 'targetX' });
    const p2 = perf({ id: 'p2', videoShortcutDriveFileId: 'sc-existing' });
    (encoreDb.performances.toArray as any).mockResolvedValueOnce([p1, p2]);
    (encoreDb.songs.toArray as any).mockResolvedValueOnce([song()]);

    // p1: target lives outside, shortcut creation succeeds, then shortcut rename matches
    (driveGetFileMetadata as any)
      .mockResolvedValueOnce({ id: 'targetX', name: 'orig.mp4', parents: ['outside'] })
      .mockResolvedValueOnce({
        id: 'newShortcut',
        name: '2025-08-15 - Hey Jude - The Beatles',
        parents: [PERF_FOLDER],
      })
      // p2: shortcut exists with wrong name
      .mockResolvedValueOnce({ id: 'sc-existing', name: 'wrong', parents: [PERF_FOLDER] });
    (driveCreateShortcut as any).mockResolvedValueOnce({ id: 'newShortcut' });
    (driveRenameFile as any).mockResolvedValueOnce(undefined); // p2 rename

    const r = await reorganizeAllPerformanceVideos('tok');
    expect(r.shortcutsCreated).toBe(1);
    expect(r.renamed).toBe(1);
    expect(r.errors).toBe(0);
    expect(encoreDb.performances.put).toHaveBeenCalledTimes(1);
    const [putArg] = (encoreDb.performances.put as any).mock.calls[0];
    expect(putArg.videoShortcutDriveFileId).toBe('newShortcut');
  });
});
