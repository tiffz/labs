import { describe, expect, it } from 'vitest';
import {
  describeYoutubePlayerError,
  isYoutubeEmbedBlockedError,
  youtubeEmbedBlockedBarHint,
  youtubePlaybackBarTitle,
} from './describeYoutubePlayerError';

describe('describeYoutubePlayerError', () => {
  it('maps known embed errors', () => {
    expect(describeYoutubePlayerError(101)).toMatch(/embedding/);
    expect(describeYoutubePlayerError(100)).toMatch(/unavailable/);
    expect(describeYoutubePlayerError(101, { embedBlockedContext: 'in Encore' })).toMatch(/in Encore/);
  });
});

describe('isYoutubeEmbedBlockedError', () => {
  it('flags embed-restricted codes', () => {
    expect(isYoutubeEmbedBlockedError(101)).toBe(true);
    expect(isYoutubeEmbedBlockedError(150)).toBe(true);
    expect(isYoutubeEmbedBlockedError(100)).toBe(false);
  });
});

describe('youtubeEmbedBlockedBarHint', () => {
  it('returns a short playback-bar line', () => {
    expect(youtubeEmbedBlockedBarHint()).toMatch(/embedding/i);
    expect(youtubeEmbedBlockedBarHint().length).toBeLessThan(60);
  });
});

describe('youtubePlaybackBarTitle', () => {
  it('replaces raw id placeholders', () => {
    expect(youtubePlaybackBarTitle('Video · ZiB1ugf53-s')).toBe('YouTube video');
    expect(youtubePlaybackBarTitle('My cover')).toBe('My cover');
  });
});
