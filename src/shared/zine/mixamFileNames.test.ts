import { describe, expect, it } from 'vitest';

import { createMixamPageFileName, createMixamSpreadFileName, mixamFileNameFromDisplayName } from './mixamFileNames';

describe('mixamFileNames', () => {
  it('creates standard page and spread filenames', () => {
    expect(createMixamPageFileName(0)).toBe('front.png');
    expect(createMixamPageFileName(1, 'jpg')).toBe('page1.jpg');
    expect(createMixamSpreadFileName(2, 3)).toBe('page2-page3.png');
  });

  it('maps display names to Mixam filenames', () => {
    expect(mixamFileNameFromDisplayName('Front Cover')).toBe('front.png');
    expect(mixamFileNameFromDisplayName('Page 2 - Page 3', { isSpread: true })).toBe('page2-3.png');
    expect(mixamFileNameFromDisplayName('Page 1', { mimeType: 'image/jpeg' })).toBe('page1.jpg');
  });
});
