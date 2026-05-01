import { describe, expect, it } from 'vitest';
import { spotifyGrantedScopesSufficientForPlaylistImport, spotifyGrantedScopesSufficientForPlaylistModify } from './spotifyScopes';

describe('spotifyGrantedScopesSufficientForPlaylistModify', () => {
  it('treats missing granted string as unknown (allow API attempt)', () => {
    expect(spotifyGrantedScopesSufficientForPlaylistModify(undefined)).toBe(true);
  });

  it('requires both playlist-modify scopes when a scope string is present', () => {
    expect(spotifyGrantedScopesSufficientForPlaylistModify('playlist-modify-public')).toBe(false);
    expect(spotifyGrantedScopesSufficientForPlaylistModify('playlist-modify-private')).toBe(false);
    expect(
      spotifyGrantedScopesSufficientForPlaylistModify('playlist-modify-public playlist-modify-private'),
    ).toBe(true);
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
