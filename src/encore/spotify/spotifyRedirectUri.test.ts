import { describe, expect, it, vi } from 'vitest';
import { encoreLoopbackUrlFromCurrent, getSpotifyRedirectUri } from './spotifyRedirectUri';

describe('getSpotifyRedirectUri', () => {
  it('uses the current origin + /encore/', () => {
    vi.stubGlobal('location', {
      origin: 'http://127.0.0.1:5173',
    } as Location);
    expect(getSpotifyRedirectUri()).toBe('http://127.0.0.1:5173/encore/');
    vi.unstubAllGlobals();
  });

  it('includes production host', () => {
    vi.stubGlobal('location', {
      origin: 'https://labs.tiffzhang.com',
    } as Location);
    expect(getSpotifyRedirectUri()).toBe('https://labs.tiffzhang.com/encore/');
    vi.unstubAllGlobals();
  });
});

describe('encoreLoopbackUrlFromCurrent', () => {
  it('maps localhost to 127.0.0.1 preserving path and query', () => {
    vi.stubGlobal('location', {
      hostname: 'localhost',
      href: 'http://localhost:5173/encore/#/songs',
    } as Location);
    expect(encoreLoopbackUrlFromCurrent()).toBe('http://127.0.0.1:5173/encore/#/songs');
    vi.unstubAllGlobals();
  });

  it('returns empty when not on localhost', () => {
    vi.stubGlobal('location', {
      hostname: '127.0.0.1',
      href: 'http://127.0.0.1:5173/encore/',
    } as Location);
    expect(encoreLoopbackUrlFromCurrent()).toBe('');
    vi.unstubAllGlobals();
  });
});
