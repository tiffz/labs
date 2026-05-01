import { describe, expect, it } from 'vitest';
import {
  buildPlaylistImportRows,
  diceCoefficient,
  encoreSongFromImportRow,
  mergeSplitPairRows,
  normalizeForMatch,
  scoreSpotifyYoutube,
  splitPairedImportRow,
  type PlaylistImportRow,
  type SplitPairRef,
} from './matchPlaylists';
import type { SpotifyPlaylistTrackRow } from '../spotify/spotifyApi';
import type { YouTubePlaylistItemRow } from '../youtube/youtubePlaylistApi';

function spRow(over: Partial<SpotifyPlaylistTrackRow> = {}): SpotifyPlaylistTrackRow {
  return { trackId: 'sp1', title: 'Song', artist: 'Artist', albumArtUrl: undefined, ...over };
}
function ytRow(over: Partial<YouTubePlaylistItemRow> = {}): YouTubePlaylistItemRow {
  return { videoId: 'yt1', title: 'Song - Artist', channelTitle: 'Artist', description: undefined, ...over };
}
function pairedRow(over: Partial<PlaylistImportRow> = {}): PlaylistImportRow {
  return {
    id: 'pair-sp1-yt1',
    spotify: spRow(),
    youtube: ytRow(),
    youtubeVideoId: 'yt1',
    matchScore: 0.9,
    kind: 'paired',
    ...over,
  };
}

describe('splitPairedImportRow', () => {
  it('returns the row unchanged when not paired', () => {
    const row = { ...pairedRow(), kind: 'spotify_only' as const, youtube: undefined };
    expect(splitPairedImportRow(row)).toEqual([row]);
  });

  it('returns the row unchanged when paired but missing one side', () => {
    const row = { ...pairedRow(), youtube: undefined };
    expect(splitPairedImportRow(row)).toEqual([row]);
  });

  it('produces a Spotify-only and a YouTube-only row that share a splitPairRef', () => {
    const split = splitPairedImportRow(pairedRow());
    expect(split).toHaveLength(2);
    const sp = split.find((r) => r.kind === 'spotify_only')!;
    const yt = split.find((r) => r.kind === 'youtube_only')!;
    expect(sp.spotify?.trackId).toBe('sp1');
    expect(sp.youtubeVideoId).toBeNull();
    expect(yt.youtube?.videoId).toBe('yt1');
    expect(yt.youtubeVideoId).toBe('yt1');
    expect(sp.splitPairRef).toEqual({ spotifyTrackId: 'sp1', youtubeVideoId: 'yt1' });
    expect(yt.splitPairRef).toEqual({ spotifyTrackId: 'sp1', youtubeVideoId: 'yt1' });
  });

  it('preserves skipRow / linkedLibrarySongId / ignoreAutoMatch on the Spotify side only', () => {
    const split = splitPairedImportRow(
      pairedRow({ skipRow: true, linkedLibrarySongId: 'lib-1', ignoreAutoMatch: true }),
    );
    const sp = split.find((r) => r.kind === 'spotify_only')!;
    const yt = split.find((r) => r.kind === 'youtube_only')!;
    expect(sp.skipRow).toBe(true);
    expect(sp.linkedLibrarySongId).toBe('lib-1');
    expect(sp.ignoreAutoMatch).toBe(true);
    expect(yt.skipRow).toBeUndefined();
    expect(yt.linkedLibrarySongId).toBeUndefined();
    expect(yt.ignoreAutoMatch).toBeUndefined();
  });
});

describe('mergeSplitPairRows', () => {
  const ref: SplitPairRef = { spotifyTrackId: 'sp1', youtubeVideoId: 'yt1' };

  it('merges sibling Spotify-only + YouTube-only rows back into a paired row', () => {
    const split = splitPairedImportRow(pairedRow());
    const merged = mergeSplitPairRows(split, ref);
    expect(merged).toHaveLength(1);
    const m = merged[0]!;
    expect(m.kind).toBe('paired');
    expect(m.spotify?.trackId).toBe('sp1');
    expect(m.youtube?.videoId).toBe('yt1');
    expect(m.youtubeVideoId).toBe('yt1');
    expect(m.matchScore).toBeGreaterThan(0);
  });

  it('returns input unchanged when one sibling is missing', () => {
    const split = splitPairedImportRow(pairedRow());
    const onlySpotify = split.filter((r) => r.kind === 'spotify_only');
    expect(mergeSplitPairRows(onlySpotify, ref)).toEqual(onlySpotify);
  });

  it('preserves position relative to other rows when merging in the middle', () => {
    const otherPaired = pairedRow({
      id: 'pair-sp2-yt2',
      spotify: spRow({ trackId: 'sp2' }),
      youtube: ytRow({ videoId: 'yt2' }),
      youtubeVideoId: 'yt2',
    });
    const split = splitPairedImportRow(pairedRow());
    const rows = [otherPaired, ...split];
    const merged = mergeSplitPairRows(rows, ref);
    expect(merged.map((r) => r.id)).toEqual(['pair-sp2-yt2', 'pair-sp1-yt1']);
  });

  it('carries skip/link/ignore flags from either sibling', () => {
    const [sp, yt] = splitPairedImportRow(pairedRow());
    const rows: PlaylistImportRow[] = [
      { ...sp!, skipRow: true, linkedLibrarySongId: 'lib-7' },
      { ...yt!, ignoreAutoMatch: true },
    ];
    const [m] = mergeSplitPairRows(rows, ref);
    expect(m?.skipRow).toBe(true);
    expect(m?.linkedLibrarySongId).toBe('lib-7');
    expect(m?.ignoreAutoMatch).toBe(true);
  });
});
describe('matchPlaylists', () => {
  it('normalizeForMatch strips noise', () => {
    expect(normalizeForMatch("Don't Stop Me Now (Official Video)")).toContain('don t stop me now');
  });

  it('diceCoefficient is high for near-identical strings', () => {
    expect(diceCoefficient('Queen Bohemian Rhapsody', 'queen bohemian rhapsody')).toBeGreaterThan(0.85);
  });

  it('scoreSpotifyYoutube matches typical artist-title YouTube name', () => {
    const sp: SpotifyPlaylistTrackRow = {
      trackId: 't1',
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
    };
    const yt: YouTubePlaylistItemRow = {
      videoId: 'v1',
      title: 'Queen - Bohemian Rhapsody (Official Video)',
      channelTitle: 'Queen Official',
    };
    expect(scoreSpotifyYoutube(sp, yt)).toBeGreaterThan(0.5);
  });

  it('buildPlaylistImportRows pairs obvious match', () => {
    const sp: SpotifyPlaylistTrackRow[] = [
      { trackId: 'a', title: 'Song A', artist: 'Artist One' },
    ];
    const yt: YouTubePlaylistItemRow[] = [
      { videoId: 'v1', title: 'Artist One - Song A', channelTitle: 'Ch' },
    ];
    const rows = buildPlaylistImportRows(sp, yt);
    expect(rows.some((r) => r.kind === 'paired' && r.youtubeVideoId === 'v1')).toBe(true);
  });

  it('scoreSpotifyYoutube is strong for cast-recording Spotify vs CurtainUp-style karaoke title', () => {
    const sp: SpotifyPlaylistTrackRow = {
      trackId: 'fg',
      title: 'For Good',
      artist: 'Stephen Schwartz, Kristin Chenoweth, Idina Menzel, Stephen Oremus',
    };
    const yt: YouTubePlaylistItemRow = {
      videoId: 'vfg',
      title: '"For Good" (Karaoke) – Wicked | Lyrics on Screen',
      channelTitle: 'CurtainUp Karaoke',
    };
    expect(scoreSpotifyYoutube(sp, yt)).toBeGreaterThan(0.45);
  });

  it('buildPlaylistImportRows pairs For Good cast track with Wicked karaoke row', () => {
    const sp: SpotifyPlaylistTrackRow[] = [
      { trackId: 'other', title: 'Drivers License', artist: 'Olivia Rodrigo' },
      {
        trackId: 'fg',
        title: 'For Good',
        artist: 'Stephen Schwartz, Kristin Chenoweth, Idina Menzel, Stephen Oremus',
      },
    ];
    const yt: YouTubePlaylistItemRow[] = [
      {
        videoId: 'vfg',
        title: '"For Good" (Karaoke) – Wicked | Lyrics on Screen',
        channelTitle: 'CurtainUp Karaoke',
      },
      { videoId: 'vd', title: 'drivers license', channelTitle: 'Covers' },
    ];
    const rows = buildPlaylistImportRows(sp, yt);
    const pair = rows.find((r) => r.kind === 'paired' && r.spotify?.trackId === 'fg');
    expect(pair?.youtubeVideoId).toBe('vfg');
  });

  it('scoreSpotifyYoutube handles bracket-heavy Reflection instrumental title', () => {
    const sp: SpotifyPlaylistTrackRow = {
      trackId: 'ref',
      title: 'Reflection',
      artist: 'Lea Salonga, Disney',
    };
    const yt: YouTubePlaylistItemRow = {
      videoId: 'vref',
      title: '[Original Key/ Instrumental] Reflection (From the movie "Mulan") Piano Instrumental/ with ENG lyrics',
      channelTitle: 'Musical Theater Accompanist',
    };
    expect(scoreSpotifyYoutube(sp, yt)).toBeGreaterThan(0.32);
  });

  it('encoreSongFromImportRow returns null for youtube-only with no video', () => {
    const row = {
      id: 'x',
      youtube: { videoId: 'v', title: 'T', channelTitle: 'C' },
      youtubeVideoId: null,
      matchScore: 0,
      kind: 'youtube_only' as const,
    };
    expect(encoreSongFromImportRow(row)).toBeNull();
  });

  it('encoreSongFromImportRow prefers manual Spotify enrichment for youtube_only', () => {
    const row = {
      id: 'x',
      youtube: {
        videoId: 'v',
        title: 'Garbage Title',
        channelTitle: 'Channel',
      },
      youtubeVideoId: 'v',
      matchScore: 0,
      kind: 'youtube_only' as const,
      spotifyEnrichment: {
        spotifyTrackId: 'spot1',
        title: 'Clean Title',
        artist: 'Clean Artist',
        albumArtUrl: 'https://example.com/a.jpg',
      },
    };
    const song = encoreSongFromImportRow(row);
    expect(song).not.toBeNull();
    expect(song!.title).toBe('Clean Title');
    expect(song!.artist).toBe('Clean Artist');
    expect(song!.spotifyTrackId).toBe('spot1');
    expect(song!.youtubeVideoId).toBe('v');
  });

  it('encoreSongFromImportRow uses description hint for low-confidence YouTube title', () => {
    const row = {
      id: 'x',
      youtube: {
        videoId: 'v',
        title: 'Karaoke Memory YouTube 2',
        channelTitle: 'Roland Soh',
        description: 'In Show - The Real Track Name\nMore credits',
      },
      youtubeVideoId: 'v',
      matchScore: 0,
      kind: 'youtube_only' as const,
    };
    const song = encoreSongFromImportRow(row);
    expect(song).not.toBeNull();
    expect(song!.title).toBe('The Real Track Name');
    expect(song!.artist).toBe('In Show');
  });

  it('encoreSongFromImportRow backing placement stores YouTube on backingLinks only', () => {
    const row = {
      id: 'x',
      youtube: {
        videoId: 'v',
        title: 'Karaoke Memory YouTube 2',
        channelTitle: 'Roland Soh',
        description: 'In Show - The Real Track Name\nMore credits',
      },
      youtubeVideoId: 'v',
      matchScore: 0,
      kind: 'youtube_only' as const,
    };
    const song = encoreSongFromImportRow(row, 'backing');
    expect(song).not.toBeNull();
    expect(song!.backingLinks?.length).toBeGreaterThan(0);
    expect(song!.referenceLinks?.length ?? 0).toBe(0);
    expect(song!.youtubeVideoId).toBeUndefined();
  });
});
