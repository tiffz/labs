import { describe, expect, it } from 'vitest';
import { readPositiveFiniteMediaDurationSec } from './stanzaMediaDuration';

describe('readPositiveFiniteMediaDurationSec', () => {
  it('returns null for NaN / non-positive / non-finite', () => {
    const el = document.createElement('audio');
    Object.defineProperty(el, 'duration', { value: NaN, configurable: true });
    expect(readPositiveFiniteMediaDurationSec(el)).toBeNull();
    Object.defineProperty(el, 'duration', { value: 0, configurable: true });
    expect(readPositiveFiniteMediaDurationSec(el)).toBeNull();
    Object.defineProperty(el, 'duration', { value: -1, configurable: true });
    expect(readPositiveFiniteMediaDurationSec(el)).toBeNull();
    Object.defineProperty(el, 'duration', { value: Infinity, configurable: true });
    expect(readPositiveFiniteMediaDurationSec(el)).toBeNull();
  });

  it('returns positive finite seconds', () => {
    const el = document.createElement('audio');
    Object.defineProperty(el, 'duration', { value: 203.4, configurable: true });
    expect(readPositiveFiniteMediaDurationSec(el)).toBe(203.4);
  });
});
