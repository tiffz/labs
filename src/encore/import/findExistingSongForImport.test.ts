import { describe, expect, it } from 'vitest';
import type { EncoreSong } from '../types';
import {
  findExistingSongForImport,
  importRowHasLibraryMerge,
  scoreSongSimilarityForImport,
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
