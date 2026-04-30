import { describe, expect, it } from 'vitest';
import {
  buildPlaylistImportRows,
  diceCoefficient,
  encoreSongFromImportRow,
  normalizeForMatch,
  scoreSpotifyYoutube,
} from './matchPlaylists';
import type { SpotifyPlaylistTrackRow } from '../spotify/spotifyApi';
import type { YouTubePlaylistItemRow } from '../youtube/youtubePlaylistApi';

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
});
