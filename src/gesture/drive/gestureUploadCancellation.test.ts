import { describe, expect, it } from 'vitest';
import { GestureUploadCancelledError, isGestureUploadCancelledError } from './gestureUploadCancellation';

describe('gestureUploadCancellation', () => {
  it('identifies upload cancelled errors', () => {
    const error = new GestureUploadCancelledError('pack-1');
    expect(isGestureUploadCancelledError(error)).toBe(true);
    expect(error.packId).toBe('pack-1');
    expect(error.message).toBe('Upload cancelled.');
  });

  it('rejects unrelated errors', () => {
    expect(isGestureUploadCancelledError(new Error('nope'))).toBe(false);
    expect(isGestureUploadCancelledError(null)).toBe(false);
  });
});
