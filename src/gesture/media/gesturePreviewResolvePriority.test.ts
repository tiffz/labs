import { describe, expect, it } from 'vitest';
import {
  clearGesturePreviewResolveTier,
  gesturePreviewResolveTier,
  setGesturePreviewResolveTier,
} from './gesturePreviewResolvePriority';

describe('gesturePreviewResolvePriority', () => {
  it('prefers lower tier numbers for visible strips', () => {
    setGesturePreviewResolveTier(['visible-a'], 0);
    setGesturePreviewResolveTier(['background-b'], 2);
    expect(gesturePreviewResolveTier('visible-a')).toBe(0);
    expect(gesturePreviewResolveTier('background-b')).toBe(2);
    expect(gesturePreviewResolveTier('unknown')).toBe(2);
    clearGesturePreviewResolveTier(['visible-a', 'background-b']);
  });

  it('keeps the best tier when re-marked', () => {
    setGesturePreviewResolveTier(['file-1'], 2);
    setGesturePreviewResolveTier(['file-1'], 0);
    expect(gesturePreviewResolveTier('file-1')).toBe(0);
    clearGesturePreviewResolveTier(['file-1']);
  });
});
