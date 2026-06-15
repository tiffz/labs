import { describe, expect, it } from 'vitest';
import { gestureAppHref, parseGestureAppHash } from './gestureAppHash';

describe('gestureAppHash', () => {
  it('defaults empty hash to practice', () => {
    expect(parseGestureAppHash('')).toEqual({ kind: 'practice' });
    expect(parseGestureAppHash('#')).toEqual({ kind: 'practice' });
  });

  it('parses practice and collections routes', () => {
    expect(parseGestureAppHash('#/practice')).toEqual({ kind: 'practice' });
    expect(parseGestureAppHash('#/collections')).toEqual({ kind: 'collections' });
    expect(parseGestureAppHash('collections')).toEqual({ kind: 'collections' });
  });

  it('builds href fragments', () => {
    expect(gestureAppHref({ kind: 'practice' })).toBe('#/practice');
    expect(gestureAppHref({ kind: 'collections' })).toBe('#/collections');
  });
});
