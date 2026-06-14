import { describe, expect, it } from 'vitest';
import { isGestureReferenceImageFile } from './gestureImageFilter';

describe('isGestureReferenceImageFile', () => {
  it('accepts image mime types', () => {
    expect(isGestureReferenceImageFile({ mimeType: 'image/jpeg', name: 'a.jpg' })).toBe(true);
    expect(isGestureReferenceImageFile({ mimeType: 'image/png', name: 'a.png' })).toBe(true);
  });

  it('accepts common extensions when mime is generic', () => {
    expect(isGestureReferenceImageFile({ mimeType: 'application/octet-stream', name: 'ref.heic' })).toBe(
      true,
    );
  });

  it('rejects folders and videos', () => {
    expect(
      isGestureReferenceImageFile({
        mimeType: 'application/vnd.google-apps.folder',
        name: 'Pack',
      }),
    ).toBe(false);
    expect(isGestureReferenceImageFile({ mimeType: 'video/mp4', name: 'clip.mp4' })).toBe(false);
  });
});
