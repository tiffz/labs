import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useStanzaPlaybackBootstrap } from './useStanzaPlaybackBootstrap';
import { readYoutubeVFromLocation } from '../utils/stanzaUrlYoutube';
import {
  hasStanzaDriveDeepLinkQuery,
  hasStanzaMediaFingerprintDeepLinkQuery,
  readStanzaDriveBootstrapFromLocation,
} from '../utils/stanzaDriveUrlParams';
import { readStanzaLastSelectedSongId } from '../db/stanzaLastSelectedSong';

vi.mock('../utils/stanzaUrlYoutube', () => ({
  readYoutubeVFromLocation: vi.fn(() => null),
}));

vi.mock('../utils/stanzaDriveUrlParams', () => ({
  readStanzaDriveBootstrapFromLocation: vi.fn(() => ({
    youtubeId: null,
    driveFileId: null,
    driveTitle: null,
    mediaFingerprint: null,
  })),
  hasStanzaDriveDeepLinkQuery: vi.fn(() => false),
  hasStanzaMediaFingerprintDeepLinkQuery: vi.fn(() => false),
}));

vi.mock('../db/stanzaLastSelectedSong', () => ({
  readStanzaLastSelectedSongId: vi.fn(() => null),
  writeStanzaLastSelectedSongId: vi.fn(),
}));

vi.mock('../import/beatLibraryImport', () => ({
  ensureBeatLibraryImported: vi.fn(async () => {}),
  findStanzaSongByMediaFingerprint: vi.fn(async () => null),
}));

vi.mock('../drive/stanzaDriveTombstones', () => ({
  getStanzaDriveTombstoneFileIds: vi.fn(() => new Set()),
}));

vi.mock('../db/stanzaDb', () => ({
  stanzaDb: {
    songs: {
      where: () => ({
        equals: () => ({
          first: vi.fn(async () => null),
        }),
      }),
    },
  },
}));

function minimalBootstrapParams(overrides: Partial<Parameters<typeof useStanzaPlaybackBootstrap>[0]> = {}) {
  return {
    songs: [],
    selected: null,
    selectedId: null,
    selectedIdRef: { current: null },
    setSelectedId: vi.fn(),
    setViewerShellPending: vi.fn(),
    ensureYoutubeSongByVideoId: vi.fn(async (videoId: string) => `song-${videoId}`),
    commitDriveDeepLinkImport: vi.fn(async () => {}),
    setDriveDeepLinkBusy: vi.fn(),
    setDriveDeepLinkError: vi.fn(),
    setFingerprintDeepLinkError: vi.fn(),
    setDriveDeepLinkNeedsGesture: vi.fn(),
    setDriveDeepLinkRemovedPrompt: vi.fn(),
    fingerprintDeepLinkError: null,
    driveDeepLinkError: null,
    ...overrides,
  };
}

describe('useStanzaPlaybackBootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readYoutubeVFromLocation).mockReturnValue(null);
    vi.mocked(readStanzaLastSelectedSongId).mockReturnValue(null);
    vi.mocked(hasStanzaDriveDeepLinkQuery).mockReturnValue(false);
    vi.mocked(hasStanzaMediaFingerprintDeepLinkQuery).mockReturnValue(false);
    vi.mocked(readStanzaDriveBootstrapFromLocation).mockReturnValue({
      youtubeId: null,
      driveFileId: null,
      driveTitle: null,
      mediaFingerprint: null,
    });
  });

  it('ensures a Dexie row and selects it when ?v= is present on first mount', async () => {
    vi.mocked(readYoutubeVFromLocation).mockReturnValue('iTEpbxV1S-k');
    const ensureYoutubeSongByVideoId = vi.fn(async (videoId: string) => `song-${videoId}`);
    const setSelectedId = vi.fn();

    renderHook(() =>
      useStanzaPlaybackBootstrap(
        minimalBootstrapParams({ ensureYoutubeSongByVideoId, setSelectedId }),
      ),
    );

    await waitFor(() => {
      expect(ensureYoutubeSongByVideoId).toHaveBeenCalledWith('iTEpbxV1S-k');
      expect(setSelectedId).toHaveBeenCalledWith('song-iTEpbxV1S-k');
    });
  });

  it('does not restore last-selected song while ?v= bootstrap is pending', async () => {
    vi.mocked(readYoutubeVFromLocation).mockReturnValue('dQw4w9WgXcQ');
    const setSelectedId = vi.fn();

    renderHook(() =>
      useStanzaPlaybackBootstrap(
        minimalBootstrapParams({
          songs: [{ id: 'saved', ytId: null, title: 'Saved', markers: [], stats: {}, updatedAt: 1 }],
          setSelectedId,
        }),
      ),
    );

    await waitFor(() => {
      expect(setSelectedId).toHaveBeenCalled();
    });

    expect(readStanzaLastSelectedSongId).not.toHaveBeenCalled();
  });
});
