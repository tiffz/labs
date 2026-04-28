import { describe, expect, it } from 'vitest';
import { isLabsDebugEnabled, isLabsOverlayEnabled } from './readLabsDebugParams';

describe('isLabsDebugEnabled', () => {
  it('treats debug and dev equivalently', () => {
    expect(isLabsDebugEnabled('?debug')).toBe(true);
    expect(isLabsDebugEnabled('?debug=')).toBe(true);
    expect(isLabsDebugEnabled('?debug=1')).toBe(true);
    expect(isLabsDebugEnabled('?debug=true')).toBe(true);
    expect(isLabsDebugEnabled('?dev=1')).toBe(true);
    expect(isLabsDebugEnabled('?dev=true')).toBe(true);
    expect(isLabsDebugEnabled('?foo=1&dev=true')).toBe(true);
  });

  it('honours explicit off values', () => {
    expect(isLabsDebugEnabled('?debug=false')).toBe(false);
    expect(isLabsDebugEnabled('?debug=0')).toBe(false);
    expect(isLabsDebugEnabled('?dev=no')).toBe(false);
  });

  it('is false when keys absent', () => {
    expect(isLabsDebugEnabled('')).toBe(false);
    expect(isLabsDebugEnabled('?x=1')).toBe(false);
  });
});

describe('isLabsOverlayEnabled', () => {
  it('matches overlay toggles', () => {
    expect(isLabsOverlayEnabled('?overlay=1')).toBe(true);
    expect(isLabsOverlayEnabled('?overlay=true')).toBe(true);
    expect(isLabsOverlayEnabled('?overlay=false')).toBe(false);
  });
});
