import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { EncoreSong } from '../types';
import type { SpotifyPlaylistTrackRow } from './spotifyApi';

// Mock the Spotify network surface so the engine runs deterministically. Each test sets
// `playlistRows` to control what the engine "sees" in the upstream playlist, and asserts on
// what landed in `savedSongs` / what was written back via `replaceSpotifyPlaylistTracks`.
const fetchSpotifyPlaylistTracksMock = vi.fn<
  (clientId: string, playlistId: string) => Promise<SpotifyPlaylistTrackRow[]>
>();
const replaceSpotifyPlaylistTracksMock = vi.fn<
  (clientId: string, playlistId: string, trackIds: readonly string[]) => Promise<void>
>(async () => {});

vi.mock('./spotifyApi', async () => {
  const actual = await vi.importActual<typeof import('./spotifyApi')>('./spotifyApi');
  return {
    ...actual,
    fetchSpotifyPlaylistTracks: (...args: Parameters<typeof fetchSpotifyPlaylistTracksMock>) =>
      fetchSpotifyPlaylistTracksMock(...args),
    replaceSpotifyPlaylistTracks: (...args: Parameters<typeof replaceSpotifyPlaylistTracksMock>) =>
      replaceSpotifyPlaylistTracksMock(...args),
  };
});

import { runEncoreSpotifyPlaylistSync } from './encoreSpotifyPlaylistSync';

function song(overrides: Partial<EncoreSong>): EncoreSong {
  const iso = '2026-01-01T00:00:00.000Z';
  return {
    id: 'sx',
    title: 'Title',
    artist: 'Artist',
    journalMarkdown: '',
    createdAt: iso,
    updatedAt: iso,
    ...overrides,
  };
}

function row(overrides: Partial<SpotifyPlaylistTrackRow> & { trackId: string }): SpotifyPlaylistTrackRow {
  return {
    title: `Title for ${overrides.trackId}`,
    artist: 'Artist',
    albumArtUrl: undefined,
    ...overrides,
  };
}

type Captured = {
  saved: EncoreSong[];
  lastSeenPersistedWith: string[][];
  rewriteIdsAsked: number;
};

function makeRun(opts: {
  songs: EncoreSong[];
  playlist: SpotifyPlaylistTrackRow[];
  previousTrackIds?: readonly string[];
  rewriteIds?: string[];
}): {
  captured: Captured;
  run: () => ReturnType<typeof runEncoreSpotifyPlaylistSync>;
} {
  const captured: Captured = { saved: [], lastSeenPersistedWith: [], rewriteIdsAsked: 0 };
  // The engine mutates `songs` via `saveSong`; tests inspect both the snapshot it was given
  // and the sequence of saves. We don't reflect saves back into the snapshot because the
  // engine only consults `songs` once at the start of each path.
  fetchSpotifyPlaylistTracksMock.mockResolvedValue(opts.playlist);

  const run = () =>
    runEncoreSpotifyPlaylistSync({
      clientId: 'cid',
      playlistId: 'pl',
      songs: opts.songs,
      saveSong: async (s) => {
        captured.saved.push(s);
      },
      setProgress: () => {},
      stubPracticing: true,
      onMergedSong: (merged, now) => ({ ...merged, practicing: true, updatedAt: now }),
      getRewriteSpotifyTrackIds: async () => {
        captured.rewriteIdsAsked += 1;
        return opts.rewriteIds ?? [];
      },
      emptyRewriteMessage: 'no tracks to write',
      previousTrackIds: opts.previousTrackIds,
      onPersistLastSeenTrackIds: async (ids) => {
        captured.lastSeenPersistedWith.push([...ids]);
      },
    });

  return { captured, run };
}

beforeEach(() => {
  fetchSpotifyPlaylistTracksMock.mockReset();
  replaceSpotifyPlaylistTracksMock.mockReset();
  replaceSpotifyPlaylistTracksMock.mockResolvedValue();
});

describe('runEncoreSpotifyPlaylistSync — deletion-aware sync', () => {
  it('respects practiceRemovedAt: tombstoned local song is NOT auto-re-set to practicing during import', async () => {
    const tombstoned = song({
      id: 's1',
      spotifyTrackId: 'sp-1',
      title: 'Yesterday',
      artist: 'The Beatles',
      practicing: false,
      practiceRemovedAt: '2026-04-01T00:00:00.000Z',
    });
    const { captured, run } = makeRun({
      songs: [tombstoned],
      // Same id is still in the playlist (someone else hasn't dropped it yet).
      playlist: [row({ trackId: 'sp-1', title: 'Yesterday', artist: 'The Beatles' })],
      // No `previousTrackIds` so we exercise just the import-side tombstone gate.
      rewriteIds: [],
    });

    const result = await run();

    // No re-add: the saved song for sp-1 should keep practicing=false and the tombstone intact.
    const savedForSp1 = captured.saved.find((s) => s.spotifyTrackId === 'sp-1');
    expect(savedForSp1).toBeDefined();
    expect(savedForSp1!.practicing).toBe(false);
    expect(savedForSp1!.practiceRemovedAt).toBe('2026-04-01T00:00:00.000Z');
    // Other fields can still merge — confirm `updatedAt` was bumped (write went through).
    expect(savedForSp1!.updatedAt).not.toBe(tombstoned.updatedAt);

    // Outcome can be review or complete depending on rewrite ids; either way the import phase ran.
    expect(['review', 'complete', 'error']).toContain(result.outcome);
  });

  it('non-tombstoned matched song is merged AND practicing is set to true (regression guard)', async () => {
    const live = song({
      id: 's1',
      spotifyTrackId: 'sp-1',
      title: 'Yesterday',
      artist: 'The Beatles',
      practicing: false,
    });
    const { captured, run } = makeRun({
      songs: [live],
      playlist: [row({ trackId: 'sp-1', title: 'Yesterday', artist: 'The Beatles' })],
      rewriteIds: ['sp-1'],
    });

    await run();

    const savedForSp1 = captured.saved.find((s) => s.spotifyTrackId === 'sp-1');
    expect(savedForSp1).toBeDefined();
    expect(savedForSp1!.practicing).toBe(true);
    expect(savedForSp1!.practiceRemovedAt).toBeUndefined();
  });

  it('Spotify-side removal: practicing song whose id disappeared since last sync is tombstoned', async () => {
    const practicing = song({
      id: 's1',
      spotifyTrackId: 'sp-removed',
      title: 'Hey Jude',
      artist: 'The Beatles',
      practicing: true,
    });
    const stillThere = song({
      id: 's2',
      spotifyTrackId: 'sp-keep',
      title: 'Let It Be',
      artist: 'The Beatles',
      practicing: true,
    });
    const { captured, run } = makeRun({
      songs: [practicing, stillThere],
      playlist: [row({ trackId: 'sp-keep', title: 'Let It Be', artist: 'The Beatles' })],
      previousTrackIds: ['sp-removed', 'sp-keep'],
      rewriteIds: ['sp-keep'],
    });

    await run();

    const savedRemoved = captured.saved.find((s) => s.id === 's1');
    expect(savedRemoved).toBeDefined();
    expect(savedRemoved!.practicing).toBe(false);
    expect(savedRemoved!.practiceRemovedAt).toBeTruthy();
    // The still-present song should NOT have been tombstoned.
    const savedKeep = captured.saved.find((s) => s.id === 's2');
    expect(savedKeep?.practiceRemovedAt).toBeUndefined();
  });

  it('Spotify-side removal: non-practicing song that disappears is left alone (no spurious tombstone)', async () => {
    const notPracticing = song({
      id: 's1',
      spotifyTrackId: 'sp-removed',
      title: 'Hey Jude',
      artist: 'The Beatles',
      practicing: false,
    });
    const { captured, run } = makeRun({
      songs: [notPracticing],
      playlist: [],
      previousTrackIds: ['sp-removed'],
      rewriteIds: [],
    });

    await run();

    // The disappeared song wasn't practicing — no save call should target it for the removal
    // path (`updatedAt` should NOT be bumped just because it's missing from the playlist).
    const removedSaves = captured.saved.filter((s) => s.id === 's1');
    expect(removedSaves).toHaveLength(0);
  });

  it('persists last-seen track ids on review outcome', async () => {
    // Force a `review` outcome by including a row that doesn't match any local song (fresh).
    const { captured, run } = makeRun({
      songs: [],
      playlist: [
        row({ trackId: 'new-1', title: 'New Song A', artist: 'Some Artist' }),
        row({ trackId: 'new-2', title: 'New Song B', artist: 'Some Artist' }),
      ],
      rewriteIds: [],
    });

    const result = await run();

    expect(result.outcome).toBe('review');
    expect(captured.lastSeenPersistedWith).toEqual([['new-1', 'new-2']]);
  });

  it('persists last-seen track ids on complete outcome', async () => {
    const matchable = song({
      id: 's1',
      spotifyTrackId: 'sp-1',
      title: 'Yesterday',
      artist: 'The Beatles',
      practicing: true,
    });
    const { captured, run } = makeRun({
      songs: [matchable],
      playlist: [row({ trackId: 'sp-1', title: 'Yesterday', artist: 'The Beatles' })],
      rewriteIds: ['sp-1'],
    });

    const result = await run();

    expect(result.outcome).toBe('complete');
    expect(captured.lastSeenPersistedWith).toEqual([['sp-1']]);
  });

  it('does not call onPersistLastSeenTrackIds when not provided', async () => {
    fetchSpotifyPlaylistTracksMock.mockResolvedValue([
      row({ trackId: 'sp-1', title: 'Yesterday', artist: 'The Beatles' }),
    ]);
    const saved: EncoreSong[] = [];
    const result = await runEncoreSpotifyPlaylistSync({
      clientId: 'cid',
      playlistId: 'pl',
      songs: [],
      saveSong: async (s) => {
        saved.push(s);
      },
      setProgress: () => {},
      stubPracticing: false,
      onMergedSong: (m, now) => ({ ...m, updatedAt: now }),
      getRewriteSpotifyTrackIds: async () => [],
      emptyRewriteMessage: 'empty',
    });
    expect(result.outcome).toBe('review');
  });
});
