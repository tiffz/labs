/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EncorePerformance, EncoreSong } from '../types';

vi.mock('./driveFetch', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./driveFetch')>();
  return {
    ...actual,
    driveCreateAnyoneReaderPermission: vi.fn(),
    driveCreateJsonFile: vi.fn(),
    driveFileHasAnyoneReader: vi.fn(),
    driveListFiles: vi.fn(),
    drivePatchJsonMedia: vi.fn(),
  };
});

vi.mock('./bootstrapFolders', () => ({
  fetchPublicDriveJson: vi.fn(),
}));

vi.mock('../db/encoreDb', () => ({
  encoreDb: {
    songs: { toArray: vi.fn() },
    performances: { toArray: vi.fn() },
    repertoireExtras: { get: vi.fn() },
  },
  getSyncMeta: vi.fn(),
  patchSyncMeta: vi.fn(),
}));

import {
  driveCreateAnyoneReaderPermission,
  driveCreateJsonFile,
  driveFileHasAnyoneReader,
  driveListFiles,
  drivePatchJsonMedia,
} from './driveFetch';
import { fetchPublicDriveJson } from './bootstrapFolders';
import { encoreDb, getSyncMeta, patchSyncMeta } from '../db/encoreDb';
import { buildPublicSnapshot, publishSnapshotToDrive } from './publicSnapshot';

function song(over: Partial<EncoreSong> = {}): EncoreSong {
  const now = new Date().toISOString();
  return {
    id: 's1',
    title: 'Song',
    artist: 'Artist',
    journalMarkdown: '',
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}
function perf(over: Partial<EncorePerformance> = {}): EncorePerformance {
  const now = new Date().toISOString();
  return {
    id: 'p1',
    songId: 's1',
    date: '2025-01-15',
    venueTag: 'Open Mic',
    notes: '',
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('buildPublicSnapshot', () => {
  it('echoes ownerDisplayName and the canonical fields, and respects onlyPerformedSongs', async () => {
    const songs = [
      song({
        id: 's1',
        title: 'Performed',
        artist: 'A',
        spotifyTrackId: 'sp1',
        youtubeVideoId: 'yt1',
        tags: ['Pop'],
        referenceLinks: [
          { id: 'r1', source: 'spotify', spotifyTrackId: 'sp1', isPrimaryReference: true },
        ],
      }),
      song({ id: 's2', title: 'Unplayed', artist: 'B' }),
    ];
    const performances = [perf({ id: 'p1', songId: 's1' })];

    (driveFileHasAnyoneReader as any).mockResolvedValue(true);
    const snap = await buildPublicSnapshot('tok', songs, performances, '  Tiff  ', {
      onlyPerformedSongs: true,
    });

    expect(snap.version).toBe(1);
    expect(snap.ownerDisplayName).toBe('Tiff');
    expect(snap.songs.map((s) => s.id)).toEqual(['s1']);
    expect(snap.songs[0]!.tags).toEqual(['Pop']);
    expect(snap.songs[0]!.referenceLinks?.[0]?.spotifyTrackId).toBe('sp1');
    expect(snap.performances).toHaveLength(1);
    expect(snap.performances[0]!.songId).toBe('s1');
  });

  it('omits empty tags / referenceLinks / backingLinks from each public song row', async () => {
    const songs = [song({ id: 's1', title: 'T', artist: 'A', tags: [] })];
    const snap = await buildPublicSnapshot('tok', songs, [], undefined);
    const row = snap.songs[0]!;
    expect(row.tags).toBeUndefined();
    expect(row.referenceLinks).toBeUndefined();
    expect(row.backingLinks).toBeUndefined();
  });

  it('preserves externalVideoUrl on performance rows without calling Drive permission probes', async () => {
    const songs = [song({ id: 's1', title: 'Performed', artist: 'A' })];
    const performances = [
      perf({ id: 'p1', songId: 's1', externalVideoUrl: 'https://youtu.be/abc' }),
    ];
    const snap = await buildPublicSnapshot('tok', songs, performances, undefined);
    expect(snap.performances[0]!.videoOpenUrl).toBe('https://youtu.be/abc');
    expect(driveFileHasAnyoneReader).not.toHaveBeenCalled();
  });

  it('drops the videoOpenUrl when the Drive permission probe denies anyone-reader', async () => {
    const songs = [song({ id: 's1', title: 'Performed', artist: 'A' })];
    const performances = [
      perf({ id: 'p1', songId: 's1', videoTargetDriveFileId: 'driveTarget' }),
    ];
    (driveFileHasAnyoneReader as any).mockResolvedValueOnce(false);
    const snap = await buildPublicSnapshot('tok', songs, performances, undefined);
    expect(snap.performances[0]!.videoOpenUrl).toBeUndefined();
  });

  it('returns the public Drive web URL when permission probe confirms anyone-reader', async () => {
    const songs = [song({ id: 's1', title: 'Performed', artist: 'A' })];
    const performances = [
      perf({ id: 'p1', songId: 's1', videoTargetDriveFileId: 'driveTarget' }),
    ];
    (driveFileHasAnyoneReader as any).mockResolvedValueOnce(true);
    const snap = await buildPublicSnapshot('tok', songs, performances, undefined);
    expect(snap.performances[0]!.videoOpenUrl).toContain('driveTarget');
  });

  it('silently omits the videoOpenUrl when the probe throws', async () => {
    const songs = [song({ id: 's1', title: 'Performed', artist: 'A' })];
    const performances = [
      perf({ id: 'p1', songId: 's1', videoShortcutDriveFileId: 'sc1' }),
    ];
    (driveFileHasAnyoneReader as any).mockRejectedValueOnce(new Error('boom'));
    const snap = await buildPublicSnapshot('tok', songs, performances, undefined);
    expect(snap.performances[0]!.videoOpenUrl).toBeUndefined();
  });
});

describe('publishSnapshotToDrive', () => {
  beforeEach(() => {
    (encoreDb.songs.toArray as any).mockResolvedValue([
      song({ id: 's1', title: 'Live', artist: 'A' }),
    ]);
    (encoreDb.performances.toArray as any).mockResolvedValue([perf({ songId: 's1' })]);
    (encoreDb.repertoireExtras.get as any).mockResolvedValue({
      id: 'default',
      ownerDisplayName: 'Tiff',
      venueCatalog: [],
      milestoneTemplate: [],
      updatedAt: new Date().toISOString(),
    });
    (getSyncMeta as any).mockResolvedValue({
      id: 'default',
      rootFolderId: 'root',
      snapshotFileId: 'existing-snap',
    });
    (drivePatchJsonMedia as any).mockResolvedValue({
      id: 'existing-snap',
      modifiedTime: '2025-01-15T00:00:00.000Z',
    });
    (driveCreateAnyoneReaderPermission as any).mockResolvedValue(undefined);
    (driveFileHasAnyoneReader as any).mockResolvedValue(false);
  });

  it('returns publiclyReadable=false (with a warning) when no API key is configured', async () => {
    const orig = (import.meta.env as any).VITE_GOOGLE_API_KEY;
    (import.meta.env as any).VITE_GOOGLE_API_KEY = '';
    try {
      const r = await publishSnapshotToDrive('tok');
      expect(r.fileId).toBe('existing-snap');
      expect(r.publiclyReadable).toBe(false);
      expect(r.warning).toMatch(/VITE_GOOGLE_API_KEY/);
      expect(patchSyncMeta).toHaveBeenCalledWith(
        expect.objectContaining({ lastPublishedSnapshotAt: expect.any(String) }),
      );
    } finally {
      (import.meta.env as any).VITE_GOOGLE_API_KEY = orig;
    }
  });

  it('flips publiclyReadable=true when the guest fetch succeeds with the API key', async () => {
    const orig = (import.meta.env as any).VITE_GOOGLE_API_KEY;
    (import.meta.env as any).VITE_GOOGLE_API_KEY = 'sample-key';
    (fetchPublicDriveJson as any).mockResolvedValueOnce({});
    try {
      const r = await publishSnapshotToDrive('tok');
      expect(r.publiclyReadable).toBe(true);
      expect(r.warning).toBeUndefined();
    } finally {
      (import.meta.env as any).VITE_GOOGLE_API_KEY = orig;
    }
  });

  it('falls back to publiclyReadable=false with a guest-fetch warning on permission failure', async () => {
    const orig = (import.meta.env as any).VITE_GOOGLE_API_KEY;
    (import.meta.env as any).VITE_GOOGLE_API_KEY = 'sample-key';
    (fetchPublicDriveJson as any).mockRejectedValueOnce(new Error('forbidden'));
    try {
      const r = await publishSnapshotToDrive('tok');
      expect(r.publiclyReadable).toBe(false);
      expect(r.warning).toMatch(/forbidden|public read check/);
    } finally {
      (import.meta.env as any).VITE_GOOGLE_API_KEY = orig;
    }
  });

  it('creates the snapshot file when meta has no snapshotFileId and lists return empty', async () => {
    (getSyncMeta as any).mockResolvedValue({ id: 'default', rootFolderId: 'root' });
    (driveListFiles as any).mockResolvedValueOnce({ files: [] });
    (driveCreateJsonFile as any).mockResolvedValueOnce({ id: 'created-snap' });
    const orig = (import.meta.env as any).VITE_GOOGLE_API_KEY;
    (import.meta.env as any).VITE_GOOGLE_API_KEY = 'sample-key';
    (fetchPublicDriveJson as any).mockResolvedValueOnce({});
    try {
      const r = await publishSnapshotToDrive('tok');
      expect(driveCreateJsonFile).toHaveBeenCalled();
      expect(r.fileId).toBe('created-snap');
    } finally {
      (import.meta.env as any).VITE_GOOGLE_API_KEY = orig;
    }
  });
});
