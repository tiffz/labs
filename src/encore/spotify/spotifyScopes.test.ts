import { describe, expect, it } from 'vitest';
import { spotifyGrantedScopesSufficientForPlaylistImport, spotifyGrantedScopesSufficientForPlaylistModify } from './spotifyScopes';

describe('spotifyGrantedScopesSufficientForPlaylistModify', () => {
  it('treats missing or empty granted string as insufficient (force re-auth for playlist writes)', () => {
    expect(spotifyGrantedScopesSufficientForPlaylistModify(undefined)).toBe(false);
    expect(spotifyGrantedScopesSufficientForPlaylistModify('')).toBe(false);
    expect(spotifyGrantedScopesSufficientForPlaylistModify('   ')).toBe(false);
  });

  it('accepts either playlist-modify scope when present', () => {
    expect(spotifyGrantedScopesSufficientForPlaylistModify('playlist-modify-public')).toBe(true);
    expect(spotifyGrantedScopesSufficientForPlaylistModify('playlist-modify-private')).toBe(true);
    expect(
      spotifyGrantedScopesSufficientForPlaylistModify('playlist-modify-public playlist-modify-private'),
    ).toBe(true);
  });

  it('rejects when scope string exists but lacks modify scopes', () => {
    expect(spotifyGrantedScopesSufficientForPlaylistModify('playlist-read-private user-read-email')).toBe(false);
  });
});

describe('spotifyGrantedScopesSufficientForPlaylistImport', () => {
  it('treats missing granted string as unknown (allow API attempt)', () => {
    expect(spotifyGrantedScopesSufficientForPlaylistImport(undefined)).toBe(true);
    expect(spotifyGrantedScopesSufficientForPlaylistImport('')).toBe(true);
    expect(spotifyGrantedScopesSufficientForPlaylistImport('   ')).toBe(true);
  });

  it('requires both playlist-read scopes when a scope string is present', () => {
    expect(spotifyGrantedScopesSufficientForPlaylistImport('playlist-read-private')).toBe(false);
    expect(spotifyGrantedScopesSufficientForPlaylistImport('playlist-read-collaborative')).toBe(false);
    expect(
      spotifyGrantedScopesSufficientForPlaylistImport('playlist-read-private playlist-read-collaborative'),
    ).toBe(true);
    expect(
      spotifyGrantedScopesSufficientForPlaylistImport('playlist-read-collaborative playlist-read-private'),
    ).toBe(true);
  });

  it('does not require playlist-modify scopes for import check', () => {
    expect(
      spotifyGrantedScopesSufficientForPlaylistImport(
        'playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private',
      ),
    ).toBe(true);
  });
});
