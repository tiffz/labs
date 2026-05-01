import { describe, expect, it } from 'vitest';
import type { EncoreSong } from '../types';
import {
  findExistingSongForImport,
  IMPORT_MATCH_AUTO_MIN,
  importRowHasLibraryMerge,
  scoreSongSimilarityForImport,
  crossSectionMovesForPlaylistRow,
  totalCrossSectionLinksForPlaylistImport,
} from './findExistingSongForImport';
import { normalizeForMatch, type PlaylistImportRow } from './matchPlaylists';

function song(p: Partial<EncoreSong> & Pick<EncoreSong, 'id' | 'title' | 'artist'>): EncoreSong {
  const now = new Date().toISOString();
  return {
    journalMarkdown: '',
    createdAt: now,
    updatedAt: now,
    ...p,
  };
}

describe('scoreSongSimilarityForImport', () => {
  it('returns 1 for identical normalized artist+title', () => {
    const a = song({ id: '1', title: 'Hey Jude', artist: 'The Beatles' });
    const b = song({ id: '2', title: 'Hey Jude', artist: 'The Beatles', spotifyTrackId: 'spotify123' });
    expect(scoreSongSimilarityForImport(a, b)).toBe(1);
  });

  it('scores highly when Spotify id matches', () => {
    const a = song({ id: '1', title: 'A', artist: 'B', spotifyTrackId: 'x' });
    const b = song({ id: '2', title: 'Different Title', artist: 'Other', spotifyTrackId: 'x' });
    expect(scoreSongSimilarityForImport(a, b)).toBe(1);
  });

  it('returns 1 when YouTube video id matches even if titles differ', () => {
    const lib = song({
      id: '1',
      title: 'Karaoke Memory YouTube 2',
      artist: 'My Library Name',
      youtubeVideoId: 'dQw4w9WgXcQ',
    });
    const inc = song({
      id: '2',
      title: 'Memory',
      artist: 'Karaoke Channel',
      youtubeVideoId: 'dQw4w9WgXcQ',
    });
    expect(scoreSongSimilarityForImport(lib, inc)).toBe(1);
  });

  it('matches YouTube id when library stores a watch URL', () => {
    const lib = song({
      id: '1',
      title: 'Karaoke Memory YouTube 2',
      artist: 'A',
      youtubeVideoId: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
    const inc = song({ id: '2', title: 'Other', artist: 'B', youtubeVideoId: 'dQw4w9WgXcQ' });
    expect(scoreSongSimilarityForImport(lib, inc)).toBe(1);
  });

  it('scores above merge threshold when title matches but artist formatting differs', () => {
    const lib = song({ id: '1', title: 'drivers license', artist: 'Olivia Rodrigo' });
    const sp = song({ id: '2', title: 'drivers license', artist: 'Olivia Rodrigo', spotifyTrackId: 's1' });
    expect(scoreSongSimilarityForImport(lib, sp)).toBeGreaterThanOrEqual(0.76);
  });

  it('matches when library title/artist are swapped vs Spotify canonical (karaoke catalog in title)', () => {
    const lib = song({
      id: '1',
      title: 'Evanescence - Piano Karaoke Instrumental',
      artist: 'My Immortal',
      spotifyTrackId: '4AuTOA3kjmi5aoZ',
    });
    const incoming = song({
      id: '2',
      title: 'My Immortal',
      artist: 'Evanescence',
      spotifyTrackId: 'differentSpotifyId',
    });
    expect(scoreSongSimilarityForImport(lib, incoming)).toBeGreaterThanOrEqual(IMPORT_MATCH_AUTO_MIN);
  });

  it('matches multi-name artist lineups via token overlap when title is identical', () => {
    const lib = song({ id: '1', title: 'Heart of Stone', artist: 'Abby Mueller' });
    const sp = song({ id: '2', title: 'Heart of Stone', artist: 'SIX, Abby Mueller', spotifyTrackId: 's2' });
    expect(scoreSongSimilarityForImport(lib, sp)).toBeGreaterThanOrEqual(0.76);
  });

  it('still scores unrelated songs below merge threshold', () => {
    const lib = song({ id: '1', title: 'Song A', artist: 'Artist One' });
    const sp = song({ id: '2', title: 'Completely Different', artist: 'Other Band', spotifyTrackId: 'z' });
    expect(scoreSongSimilarityForImport(lib, sp)).toBeLessThan(0.76);
  });

  it('scores soundtrack store title above unrelated songs for bulk-style incoming title', () => {
    const letItGoLib = song({
      id: '1',
      title: 'Let It Go - From "Frozen"/Soundtrack Version',
      artist: 'Idina Menzel',
    });
    const otherLib = song({ id: '2', title: 'Sister Rosetta Goes Before Us', artist: 'Robert Plant, Alison Krauss' });
    const inc = song({ id: 'imp', title: "Let It Go - Martuni's", artist: "Martuni's · clip" });
    expect(scoreSongSimilarityForImport(letItGoLib, inc)).toBeGreaterThan(
      scoreSongSimilarityForImport(otherLib, inc),
    );
  });
});

describe('findExistingSongForImport', () => {
  it('matches by Spotify track id when present on both', () => {
    const existing = [song({ id: 'e1', title: 'Old', artist: 'Name', spotifyTrackId: 'tr1' })];
    const incoming = song({ id: 'i', title: 'New', artist: 'Name', spotifyTrackId: 'tr1' });
    expect(findExistingSongForImport(existing, incoming)?.id).toBe('e1');
  });

  it('matches by Spotify track id with whitespace trimmed', () => {
    const existing = [song({ id: 'e1', title: 'Old', artist: 'Name', spotifyTrackId: 'tr1' })];
    const incoming = song({ id: 'i', title: 'New', artist: 'Name', spotifyTrackId: '  tr1  ' });
    expect(findExistingSongForImport(existing, incoming)?.id).toBe('e1');
  });

  it('matches by YouTube video id when titles from import parser differ from library', () => {
    const existing = [
      song({
        id: 'lib-yt',
        title: 'Karaoke Memory YouTube 2',
        artist: 'Saved as in library',
        youtubeVideoId: 'AbCdEfGhIj0',
      }),
    ];
    const incoming = song({
      id: 'imp',
      title: 'Memory',
      artist: 'Some Karaoke Channel',
      youtubeVideoId: 'AbCdEfGhIj0',
    });
    expect(findExistingSongForImport(existing, incoming)?.id).toBe('lib-yt');
  });

  it('matches by YouTube video id when library stores watch URL and incoming stores bare id', () => {
    const existing = [
      song({
        id: 'lib-url',
        title: 'Same video',
        artist: 'A',
        youtubeVideoId: 'https://www.youtube.com/watch?v=AbCdEfGhIj0',
      }),
    ];
    const incoming = song({ id: 'imp', title: 'X', artist: 'Y', youtubeVideoId: 'AbCdEfGhIj0' });
    expect(findExistingSongForImport(existing, incoming)?.id).toBe('lib-url');
  });

  it('matches library song without Spotify id when title and artist align with playlist import', () => {
    const existing = [
      song({
        id: 'lib1',
        title: 'Bohemian Rhapsody',
        artist: 'Queen',
      }),
    ];
    const incoming = song({
      id: 'imp',
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      spotifyTrackId: 'spotifyTrackIdOnlyOnImport',
    });
    expect(findExistingSongForImport(existing, incoming)?.id).toBe('lib1');
  });

  it('matches when normalized title matches and library lacks Spotify id (artist wording differs)', () => {
    const existing = [
      song({
        id: 'lib-dl',
        title: 'Drivers License',
        artist: 'Olivia Rodrigo',
      }),
    ];
    const incoming = song({
      id: 'imp',
      title: 'drivers license',
      artist: 'Olivia Rodrigo',
      spotifyTrackId: 'onlyOnIncoming',
    });
    expect(normalizeForMatch('Drivers License')).toBe(normalizeForMatch('drivers license'));
    expect(findExistingSongForImport(existing, incoming)?.id).toBe('lib-dl');
  });

  it('matches I Dreamed a Dream across minor title / artist formatting', () => {
    const existing = [
      song({
        id: 'lib-les',
        title: 'I Dreamed a Dream',
        artist: 'Patti LuPone',
      }),
    ];
    const incoming = song({
      id: 'imp',
      title: 'I Dreamed A Dream',
      artist: 'Patti Lupone',
      spotifyTrackId: 'onlyOnIncoming',
    });
    expect(findExistingSongForImport(existing, incoming)?.id).toBe('lib-les');
  });

  it('matches alternate Spotify recording when title has [Live] and artist differs (cast vs solo)', () => {
    const existing = [
      song({
        id: 'lib-omo',
        title: 'On My Own (From "Les Misérables")',
        artist: 'Original London Cast',
        spotifyTrackId: 'studioTrackId',
      }),
    ];
    const incoming = song({
      id: 'imp',
      title: 'On My Own (From "Les misérables") [Live]',
      artist: 'Lea Salonga',
      spotifyTrackId: 'liveTrackId',
      albumArtUrl: 'https://example.com/a.jpg',
    });
    expect(findExistingSongForImport(existing, incoming)?.id).toBe('lib-omo');
    expect(scoreSongSimilarityForImport(existing[0]!, incoming)).toBeGreaterThanOrEqual(IMPORT_MATCH_AUTO_MIN);
  });

  it('returns null when nothing is close enough', () => {
    const existing = [song({ id: 'e1', title: 'Song A', artist: 'Artist One' })];
    const incoming = song({ id: 'i', title: 'Completely Different', artist: 'Other Band', spotifyTrackId: 'z' });
    expect(findExistingSongForImport(existing, incoming)).toBeNull();
  });
});

describe('importRowHasLibraryMerge', () => {
  it('returns true when linkedLibrarySongId is set', () => {
    const row = {
      id: 'r1',
      kind: 'spotify_only' as const,
      youtubeVideoId: null,
      matchScore: 0,
      linkedLibrarySongId: 'lib-1',
    } satisfies PlaylistImportRow;
    expect(importRowHasLibraryMerge(row, [])).toBe(true);
  });

  it('returns true when auto-match would merge', () => {
    const existing = [song({ id: 'e1', title: 'Hey Jude', artist: 'The Beatles' })];
    const row = {
      id: 'r1',
      kind: 'spotify_only' as const,
      youtubeVideoId: null,
      matchScore: 0,
      spotify: { trackId: 'sp1', title: 'Hey Jude', artist: 'The Beatles' },
    } satisfies PlaylistImportRow;
    expect(importRowHasLibraryMerge(row, existing)).toBe(true);
  });

  it('returns false when ignoreAutoMatch is set without manual link', () => {
    const existing = [song({ id: 'e1', title: 'Hey Jude', artist: 'The Beatles' })];
    const row = {
      id: 'r1',
      kind: 'spotify_only' as const,
      youtubeVideoId: null,
      matchScore: 0,
      spotify: { trackId: 'sp1', title: 'Hey Jude', artist: 'The Beatles' },
      ignoreAutoMatch: true,
    } satisfies PlaylistImportRow;
    expect(importRowHasLibraryMerge(row, existing)).toBe(false);
  });

  it('returns false when no encodable song and no manual link', () => {
    const row = {
      id: 'r1',
      kind: 'youtube_only' as const,
      youtube: { videoId: 'v1', title: 'T', channelTitle: 'C' },
      youtubeVideoId: null,
      matchScore: 0,
    } satisfies PlaylistImportRow;
    expect(importRowHasLibraryMerge(row, [])).toBe(false);
  });
});

describe('crossSectionMovesForPlaylistRow', () => {
  it('counts backing import when same YouTube is legacy reference only (referenceLinks has no YouTube row)', () => {
    const vid = 'RRSAkl0Dkrk';
    const lib = song({
      id: 'lib1',
      title: 'I’ll Only Love You More',
      artist: 'Cast',
      spotifyTrackId: 'spCat',
      youtubeVideoId: vid,
      referenceLinks: [
        { id: 'r1', source: 'spotify', spotifyTrackId: 'spCat', isPrimaryReference: true },
      ],
    });
    const row = {
      id: 'imp',
      kind: 'youtube_only' as const,
      youtube: { videoId: vid, title: 'instrumental', channelTitle: 'ch' },
      youtubeVideoId: vid,
      matchScore: 1,
    } satisfies PlaylistImportRow;
    expect(crossSectionMovesForPlaylistRow(row, [lib], 'backing')).toBe(1);
  });

  it('counts backing import when same YouTube is a reference link', () => {
    const vid = 'AbCdEfGhIj0';
    const lib = song({
      id: 'lib1',
      title: 'Song',
      artist: 'Artist',
      spotifyTrackId: 'sp1',
      referenceLinks: [
        { id: 'r1', source: 'spotify', spotifyTrackId: 'sp1', isPrimaryReference: true },
        { id: 'r2', source: 'youtube', youtubeVideoId: vid, youtubeKind: 'reference', isPrimaryReference: false },
      ],
    });
    const row = {
      id: 'imp',
      kind: 'paired' as const,
      spotify: { trackId: 'sp1', title: 'Song', artist: 'Artist' },
      youtube: { videoId: vid, title: 'karaoke', channelTitle: 'k' },
      youtubeVideoId: vid,
      matchScore: 0.9,
    } satisfies PlaylistImportRow;
    expect(crossSectionMovesForPlaylistRow(row, [lib], 'backing')).toBeGreaterThanOrEqual(1);
  });
});

describe('totalCrossSectionLinksForPlaylistImport', () => {
  it('returns zero counts when no rows match an existing song', () => {
    const existing = [song({ id: 'e1', title: 'A', artist: 'X' })];
    const rows: PlaylistImportRow[] = [
      {
        id: 'r1',
        kind: 'spotify_only',
        spotify: { trackId: 'sp1', title: 'Different', artist: 'Other' },
        youtubeVideoId: null,
        matchScore: 0,
      },
    ];
    expect(totalCrossSectionLinksForPlaylistImport(rows, existing, 'backing')).toEqual({
      fromReference: 0,
      fromBacking: 0,
    });
  });

  it('skips rows marked skipRow', () => {
    const vid = 'CCCCCCCCCCC';
    const lib = song({
      id: 'lib1',
      title: 'Song',
      artist: 'Artist',
      referenceLinks: [
        { id: 'r1', source: 'youtube', youtubeVideoId: vid, youtubeKind: 'reference', isPrimaryReference: true },
      ],
    });
    const rows: PlaylistImportRow[] = [
      {
        id: 'imp',
        kind: 'youtube_only',
        youtube: { videoId: vid, title: 'instrumental', channelTitle: 'ch' },
        youtubeVideoId: vid,
        matchScore: 1,
        linkedLibrarySongId: 'lib1',
        skipRow: true,
      },
    ];
    const totals = totalCrossSectionLinksForPlaylistImport(rows, [lib], 'backing');
    expect(totals.fromReference).toBe(0);
  });

  it('sums fromReference across multiple backing imports merging into different library songs', () => {
    const vidA = 'AAAAAAAAAAA';
    const vidB = 'BBBBBBBBBBB';
    const libA = song({
      id: 'libA',
      title: 'Song A',
      artist: 'Artist',
      referenceLinks: [
        { id: 'r1', source: 'youtube', youtubeVideoId: vidA, youtubeKind: 'reference', isPrimaryReference: true },
      ],
    });
    const libB = song({
      id: 'libB',
      title: 'Song B',
      artist: 'Artist',
      referenceLinks: [
        { id: 'r2', source: 'youtube', youtubeVideoId: vidB, youtubeKind: 'reference', isPrimaryReference: true },
      ],
    });
    const rows: PlaylistImportRow[] = [
      {
        id: 'i1',
        kind: 'youtube_only',
        youtube: { videoId: vidA, title: 'kar', channelTitle: 'c' },
        youtubeVideoId: vidA,
        matchScore: 1,
        linkedLibrarySongId: 'libA',
      },
      {
        id: 'i2',
        kind: 'youtube_only',
        youtube: { videoId: vidB, title: 'kar', channelTitle: 'c' },
        youtubeVideoId: vidB,
        matchScore: 1,
        linkedLibrarySongId: 'libB',
      },
    ];
    const totals = totalCrossSectionLinksForPlaylistImport(rows, [libA, libB], 'backing');
    expect(totals.fromReference).toBe(2);
    expect(totals.fromBacking).toBe(0);
  });

  it('counts fromBacking when reference imports clash with existing backing rows', () => {
    const lib = song({
      id: 'libC',
      title: 'C',
      artist: 'Y',
      backingLinks: [
        { id: 'b1', source: 'spotify', spotifyTrackId: 'spDup', isPrimaryBacking: true },
      ],
    });
    const rows: PlaylistImportRow[] = [
      {
        id: 'r',
        kind: 'spotify_only',
        spotify: { trackId: 'spDup', title: 'C', artist: 'Y' },
        youtubeVideoId: null,
        matchScore: 1,
        linkedLibrarySongId: 'libC',
      },
    ];
    const totals = totalCrossSectionLinksForPlaylistImport(rows, [lib], 'reference');
    expect(totals.fromBacking).toBe(1);
    expect(totals.fromReference).toBe(0);
  });
});
