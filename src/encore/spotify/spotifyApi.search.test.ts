import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { buildSpotifyTrackSearchQuery, searchTracks } from './spotifyApi';

describe('searchTracks', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        const u = new URL(url);
        expect(u.pathname).toBe('/v1/search');
        const limit = u.searchParams.get('limit');
        expect(limit).not.toBeNull();
        expect(Number(limit)).toBeLessThanOrEqual(10);
        expect(Number(limit)).toBeGreaterThanOrEqual(1);
        expect(u.searchParams.get('type')).toBe('track');
        const q = u.searchParams.get('q');
        expect(q).toBeTruthy();
        expect(q!.length).toBeLessThanOrEqual(200);
        return new Response(JSON.stringify({ tracks: { items: [] } }), { status: 200 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.fetch = originalFetch;
  });

  it('never sends limit above 10 to Spotify search', async () => {
    await searchTracks('tok', 'bohemian rhapsody queen', 99);
    expect(fetch).toHaveBeenCalled();
    const url = String((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0]);
    expect(new URL(url).searchParams.get('limit')).toBe('10');
  });

  it('truncates very long queries before requesting', async () => {
    const long = `${'word '.repeat(40)}phantom`;
    await searchTracks('tok', long, 5);
    const url = String((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0]);
    const q = new URL(url).searchParams.get('q') ?? '';
    expect(q.length).toBeLessThanOrEqual(200);
  });
});

describe('buildSpotifyTrackSearchQuery', () => {
  it('uses track and artist field filters when artist is present', () => {
    const q = buildSpotifyTrackSearchQuery({
      songTitle: 'On My Own',
      artistHint: 'Les Misérables',
      channelTitle: 'Sing King',
    });
    expect(q).toContain('track:');
    expect(q).toContain('On My Own');
    expect(q).toContain('artist:');
    expect(q).toContain('Les Misérables');
    expect(q).not.toMatch(/Sing King/i);
  });

  it('falls back to track-only when channel is generic karaoke', () => {
    const q = buildSpotifyTrackSearchQuery({
      songTitle: 'Drivers License',
      artistHint: '',
      channelTitle: 'Sing King',
    });
    expect(q).toMatch(/^track:/);
    expect(q).toContain('Drivers License');
    expect(q).not.toContain('artist:');
  });

  it('uses channel as artist hint when non-generic', () => {
    const q = buildSpotifyTrackSearchQuery({
      songTitle: 'Some Song',
      artistHint: '',
      channelTitle: 'Original Broadway Cast',
    });
    expect(q).toContain('artist:');
    expect(q).toContain('Original Broadway Cast');
  });
});
