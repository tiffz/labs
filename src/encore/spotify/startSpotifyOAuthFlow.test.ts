import { afterEach, describe, expect, it, vi } from 'vitest';
import { startSpotifyOAuthFlow } from './startSpotifyOAuthFlow';

describe('startSpotifyOAuthFlow', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns error when client id is empty', async () => {
    const r = await startSpotifyOAuthFlow('  ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/VITE_SPOTIFY_CLIENT_ID/i);
  });

  it('returns loopback URL when hostname is localhost', async () => {
    vi.stubGlobal('window', {
      ...window,
      location: {
        ...window.location,
        hostname: 'localhost',
        href: 'http://localhost:5173/encore/#/library',
      },
    });
    const r = await startSpotifyOAuthFlow('dummy-client-id');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toMatch(/127\.0\.0\.1/);
      expect(r.openOnLoopbackUrl).toBe('http://127.0.0.1:5173/encore/#/library');
    }
  });
});
