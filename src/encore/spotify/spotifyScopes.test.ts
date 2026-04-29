import { describe, expect, it } from 'vitest';
import { spotifyGrantedScopesSufficientForPlaylistImport } from './spotifyScopes';

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
});
