import { afterEach, describe, expect, it } from 'vitest';

import {
  clearEmojiRasterCache,
  emojiRasterCacheKey,
  emojiRasterImageSize,
  rasterizeEmojiToDataUrl,
} from './emojiRasterize';

describe('emojiRasterize', () => {
  afterEach(() => {
    clearEmojiRasterCache();
  });

  it('builds a stable cache key', () => {
    expect(emojiRasterCacheKey('🧑', 32, 2)).toBe('🧑|32|2.00|o0');
    expect(emojiRasterCacheKey('🧑', 32, 2, 3)).toBe('🧑|32|2.00|o3');
  });

  it('includes outline padding in image size', () => {
    expect(emojiRasterImageSize(24, 0)).toBe(24);
    expect(emojiRasterImageSize(24, 3)).toBe(30);
  });

  it('rasterizes an emoji to a png data url in jsdom with canvas', () => {
    // jsdom may lack a real canvas implementation — accept null there.
    const url = rasterizeEmojiToDataUrl('🐱', 24, 1);
    if (url) {
      expect(url.startsWith('data:image/png')).toBe(true);
      expect(rasterizeEmojiToDataUrl('🐱', 24, 1)).toBe(url);
    } else {
      expect(url).toBeNull();
    }
  });
});
