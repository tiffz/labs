/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EncorePerformance, EncoreSong } from '../types';
import type { DriveDuplicateGroup } from './driveDuplicateDetection';

vi.mock('../db/encoreDb', () => ({
  encoreDb: {
    songs: {
      toArray: vi.fn(),
      put: vi.fn(),
    },
    performances: {
      toArray: vi.fn(),
      put: vi.fn(),
    },
  },
  markDirtyRow: vi.fn(),
}));

vi.mock('../../shared/drive/driveFetch', () => ({
  driveTrashFile: vi.fn(),
}));

import { driveTrashFile } from '../../shared/drive/driveFetch';
import { encoreDb, markDirtyRow } from '../db/encoreDb';
import { applyEncoreDriveDuplicateDedup } from './driveDuplicateDedup';

const ISO = '2026-01-01T00:00:00.000Z';

function baseSong(overrides: Partial<EncoreSong> = {}): EncoreSong {
  return {
    id: 's1',
    title: 'Test',
    artist: 'Artist',
    journalMarkdown: '',
    createdAt: ISO,
    updatedAt: ISO,
    ...overrides,
  };
}

function duplicateGroup(): DriveDuplicateGroup {
  return {
    key: 'md5:abc',
    canonicalFileId: 'canonical',
    canonicalMediaFileId: 'canonical',
    members: [
      {
        fileId: 'raw-canonical',
        mediaFileId: 'canonical',
        name: 'Chart.pdf',
        referenceCount: 1,
        sampleRefs: [],
        allRefs: [],
      },
      {
        fileId: 'raw-dup',
        mediaFileId: 'dup-media',
        name: 'Chart (1).pdf',
        referenceCount: 1,
        sampleRefs: [],
        allRefs: [],
      },
    ],
    fileIdsToTrash: ['dup-media', 'raw-dup'],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (driveTrashFile as any).mockResolvedValue(undefined);
});

describe('applyEncoreDriveDuplicateDedup', () => {
  it('rewrites song and performance Drive ids to the canonical file and trashes extras', async () => {
    const song = baseSong({
      sheetMusicDriveFileId: 'dup-media',
      recordingDriveFileIds: ['raw-dup'],
      attachments: [
        {
          kind: 'chart',
          driveFileId: 'raw-dup',
          encoreShortcutDriveFileId: 'shortcut-dup',
        },
      ],
    });
    const performance: EncorePerformance = {
      id: 'p1',
      songId: 's1',
      date: '2026-01-15',
      venueTag: 'Club',
      createdAt: ISO,
      updatedAt: ISO,
      videoTargetDriveFileId: 'dup-media',
      videoShortcutDriveFileId: 'shortcut-dup',
    };

    (encoreDb.songs.toArray as any).mockResolvedValue([song]);
    (encoreDb.performances.toArray as any).mockResolvedValue([performance]);

    const result = await applyEncoreDriveDuplicateDedup('tok', [duplicateGroup()]);

    expect(result.songsUpdated).toBe(1);
    expect(result.performancesUpdated).toBe(1);
    expect(result.trashed).toBe(2);
    expect(result.trashErrors).toBe(0);

    const savedSong = (encoreDb.songs.put as any).mock.calls[0][0] as EncoreSong;
    expect(savedSong.sheetMusicDriveFileId).toBe('canonical');
    expect(savedSong.recordingDriveFileIds).toEqual(['canonical']);
    expect(savedSong.attachments?.[0]?.driveFileId).toBe('canonical');
    expect(savedSong.attachments?.[0]?.encoreShortcutDriveFileId).toBeUndefined();

    const savedPerf = (encoreDb.performances.put as any).mock.calls[0][0] as EncorePerformance;
    expect(savedPerf.videoTargetDriveFileId).toBe('canonical');
    expect(savedPerf.videoShortcutDriveFileId).toBeUndefined();

    expect(markDirtyRow).toHaveBeenCalledWith('song', 's1', 'upsert');
    expect(markDirtyRow).toHaveBeenCalledWith('performance', 'p1', 'upsert');
    expect(driveTrashFile).toHaveBeenCalledWith('tok', 'dup-media');
    expect(driveTrashFile).toHaveBeenCalledWith('tok', 'raw-dup');
  });

  it('returns zeros when there is nothing to replace', async () => {
    (encoreDb.songs.toArray as any).mockResolvedValue([]);
    (encoreDb.performances.toArray as any).mockResolvedValue([]);

    const result = await applyEncoreDriveDuplicateDedup('tok', []);

    expect(result).toEqual({
      songsUpdated: 0,
      performancesUpdated: 0,
      trashed: 0,
      trashErrors: 0,
    });
    expect(encoreDb.songs.put).not.toHaveBeenCalled();
    expect(driveTrashFile).not.toHaveBeenCalled();
  });
});
