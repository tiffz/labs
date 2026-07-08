import { describe, expect, it } from 'vitest';
import type { DerivedSegment } from './segments';
import {
  resolveEffectiveStanzaLoopMode,
  resolveStanzaSkipTarget,
  type StanzaPlaybackFocus,
} from './stanzaPlaybackFocus';

const segments: DerivedSegment[] = [
  { id: 'a', index: 0, label: 'A', start: 0, end: 30 },
  { id: 'b', index: 1, label: 'B', start: 30, end: 60 },
];

describe('stanzaPlaybackFocus', () => {
  it('falls back loopSelection without span to through', () => {
    const focus: StanzaPlaybackFocus = { loopMode: 'loopSelection', selectionSpan: null };
    expect(resolveEffectiveStanzaLoopMode(focus)).toBe('through');
  });

  it('skip-to-start seeks song start after selection cleared (loopSelection + null span)', () => {
    const focus: StanzaPlaybackFocus = { loopMode: 'loopSelection', selectionSpan: null };
    expect(
      resolveStanzaSkipTarget('start', {
        focus,
        duration: 120,
        segments,
        skipped: undefined,
      }),
    ).toBe(0);
  });

  it('skip-to-start seeks selection start when loopSelection has a span', () => {
    const focus: StanzaPlaybackFocus = {
      loopMode: 'loopSelection',
      selectionSpan: { start: 30, end: 60 },
    };
    expect(
      resolveStanzaSkipTarget('start', {
        focus,
        duration: 120,
        segments,
        skipped: undefined,
      }),
    ).toBe(30);
  });

  it('skip-to-end seeks song end in loopAll mode', () => {
    const focus: StanzaPlaybackFocus = { loopMode: 'loopAll', selectionSpan: null };
    expect(
      resolveStanzaSkipTarget('end', {
        focus,
        duration: 60,
        segments,
        skipped: undefined,
      }),
    ).toBeLessThan(60);
    expect(
      resolveStanzaSkipTarget('end', {
        focus,
        duration: 60,
        segments,
        skipped: undefined,
      }),
    ).toBeGreaterThan(59);
  });
});
