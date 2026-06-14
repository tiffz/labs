import { describe, expect, it } from 'vitest';
import {
  buildDriveThumbnailFallbackUrl,
  scaleDriveThumbnailUrl,
} from '../media/gestureReferenceImageUrl';

describe('gestureReferenceImageUrl', () => {
  it('scales trailing =s parameter', () => {
    expect(scaleDriveThumbnailUrl('https://lh3.googleusercontent.com/foo=s220', 1920)).toBe(
      'https://lh3.googleusercontent.com/foo=s1920',
    );
  });

  it('scales sz=w drive thumbnail urls', () => {
    expect(scaleDriveThumbnailUrl('https://drive.google.com/thumbnail?id=x&sz=w1920', 320)).toBe(
      'https://drive.google.com/thumbnail?id=x&sz=w320',
    );
  });

  it('builds drive thumbnail fallback', () => {
    expect(buildDriveThumbnailFallbackUrl('file123', 1920)).toBe(
      'https://drive.google.com/thumbnail?id=file123&sz=w1920',
    );
  });
});
