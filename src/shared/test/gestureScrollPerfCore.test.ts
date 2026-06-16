import { describe, expect, it } from 'vitest';
import {
  COLLECTIONS_SCROLL_MAX_FRAME_MS,
  summarizeGestureScrollFrames,
} from './gestureScrollPerfCore';

describe('gestureScrollPerfCore', () => {
  it('summarizes frame samples', () => {
    const summary = summarizeGestureScrollFrames([12, 18, 22, 40, 55, 16]);
    expect(summary.maxFrameMs).toBe(55);
    expect(summary.p95FrameMs).toBe(55);
  });

  it('documents a 60fps-friendly scroll frame budget', () => {
    expect(COLLECTIONS_SCROLL_MAX_FRAME_MS).toBeLessThanOrEqual(50);
  });
});
