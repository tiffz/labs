import { describe, expect, it } from 'vitest';
import { classifyHorizontalSwipe, isTapGesture } from './readerGestures';

describe('classifyHorizontalSwipe (LTR reader)', () => {
  it('treats a clear leftward drag as next', () => {
    expect(classifyHorizontalSwipe(-80, 5)).toBe('next');
  });

  it('treats a clear rightward drag as prev', () => {
    expect(classifyHorizontalSwipe(80, -5)).toBe('prev');
  });

  it('ignores short travel (a tap)', () => {
    expect(classifyHorizontalSwipe(20, 0)).toBeNull();
    expect(classifyHorizontalSwipe(-20, 0)).toBeNull();
  });

  it('ignores mostly-vertical travel (a scroll), even when long', () => {
    expect(classifyHorizontalSwipe(50, 120)).toBeNull();
    expect(classifyHorizontalSwipe(-50, -120)).toBeNull();
  });

  it('respects custom thresholds', () => {
    expect(classifyHorizontalSwipe(30, 0, { minDistance: 25 })).toBe('prev');
    expect(classifyHorizontalSwipe(60, 0, { minDistance: 100 })).toBeNull();
  });
});

describe('isTapGesture', () => {
  it('accepts a small, brief press', () => {
    expect(isTapGesture(3, -4, 120)).toBe(true);
  });

  it('rejects long travel', () => {
    expect(isTapGesture(40, 0, 120)).toBe(false);
  });

  it('rejects a slow long-press', () => {
    expect(isTapGesture(2, 2, 900)).toBe(false);
  });
});
