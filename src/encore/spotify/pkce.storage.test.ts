import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearSpotifyToken, hasUsableSpotifyTokenBundle, readSpotifyToken, storeSpotifyToken } from './pkce';

const KEY = 'encore_spotify_token_json';

describe('Spotify token persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    clearSpotifyToken();
  });

  it('migrates legacy sessionStorage token to localStorage on read', () => {
    const bundle = { access_token: 'tok', expires_at: Date.now() + 120_000, refresh_token: 'ref' };
    sessionStorage.setItem(KEY, JSON.stringify(bundle));
    const read = readSpotifyToken();
    expect(read).toMatchObject({ access_token: 'tok', refresh_token: 'ref' });
    expect(localStorage.getItem(KEY)).toBeTruthy();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('storeSpotifyToken writes localStorage and clears session copy', () => {
    sessionStorage.setItem(KEY, '{"bogus":1}');
    storeSpotifyToken({ access_token: 'x', expires_at: Date.now() + 60_000 });
    expect(JSON.parse(localStorage.getItem(KEY)!)).toMatchObject({ access_token: 'x' });
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('clearSpotifyToken removes both storages', () => {
    localStorage.setItem(KEY, '{"access_token":"a","expires_at":9}');
    sessionStorage.setItem(KEY, '{"access_token":"b","expires_at":9}');
    clearSpotifyToken();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('hasUsableSpotifyTokenBundle is true for fresh access token', () => {
    storeSpotifyToken({ access_token: 't', expires_at: Date.now() + 60_000 });
    expect(hasUsableSpotifyTokenBundle()).toBe(true);
  });

  it('hasUsableSpotifyTokenBundle is true when access expired but refresh exists', () => {
    storeSpotifyToken({ access_token: 't', expires_at: Date.now() - 1000, refresh_token: 'r' });
    expect(hasUsableSpotifyTokenBundle()).toBe(true);
  });

  it('hasUsableSpotifyTokenBundle is false when access expired and no refresh', () => {
    storeSpotifyToken({ access_token: 't', expires_at: Date.now() - 1000 });
    expect(hasUsableSpotifyTokenBundle()).toBe(false);
  });
});
