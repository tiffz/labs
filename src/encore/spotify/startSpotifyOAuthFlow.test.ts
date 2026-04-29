import { describe, expect, it } from 'vitest';
import { startSpotifyOAuthFlow } from './startSpotifyOAuthFlow';

describe('startSpotifyOAuthFlow', () => {
  it('returns error when client id is empty', async () => {
    const r = await startSpotifyOAuthFlow('  ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/VITE_SPOTIFY_CLIENT_ID/i);
  });
});
