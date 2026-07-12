import { describe, expect, it } from 'vitest';

import { inferPublishPlatformFromUrl } from './inferPublishPlatform';

describe('inferPublishPlatformFromUrl', () => {
  it('maps major comic and social hosts', () => {
    expect(inferPublishPlatformFromUrl('https://tapas.io/series/foo')).toEqual({
      platform: 'Tapas',
      source: 'known',
    });
    expect(inferPublishPlatformFromUrl('https://www.webtoons.com/en/foo')).toEqual({
      platform: 'WEBTOON',
      source: 'known',
    });
    expect(inferPublishPlatformFromUrl('https://instagram.com/p/abc')).toEqual({
      platform: 'Instagram',
      source: 'known',
    });
    expect(inferPublishPlatformFromUrl('x.com/user/status/1')).toEqual({
      platform: 'X',
      source: 'known',
    });
  });

  it('derives indie site names from hostname', () => {
    expect(inferPublishPlatformFromUrl('https://my-comic-site.example.com/read')).toEqual({
      platform: 'Example',
      source: 'hostname',
    });
    expect(inferPublishPlatformFromUrl('https://bravelittlecomic.net/chapter-1')).toEqual({
      platform: 'Bravelittlecomic',
      source: 'hostname',
    });
  });

  it('returns null for empty or invalid input', () => {
    expect(inferPublishPlatformFromUrl('')).toBeNull();
    expect(inferPublishPlatformFromUrl('   ')).toBeNull();
    expect(inferPublishPlatformFromUrl('not a url at all')).toBeNull();
  });
});
