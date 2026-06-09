import { describe, expect, it } from 'vitest';
import { encoreSpotifyInAppPlaybackSupported } from './encoreSpotifyEmbed';

describe('encoreSpotifyInAppPlaybackSupported', () => {
  it('is off unless explicitly enabled via env', () => {
    expect(encoreSpotifyInAppPlaybackSupported()).toBe(false);
  });
});
