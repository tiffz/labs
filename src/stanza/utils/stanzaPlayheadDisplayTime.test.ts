import { describe, expect, it } from 'vitest';
import {
  resolveStanzaTimelineTransport,
  stanzaPlayheadDisplayTime,
} from './stanzaPlayheadDisplayTime';

describe('resolveStanzaTimelineTransport', () => {
  it('prefers pending when it matches live transport (active scrub)', () => {
    expect(resolveStanzaTimelineTransport(50.1, 50.2)).toBe(50.2);
  });

  it('drops stale pending after playback moved on', () => {
    expect(resolveStanzaTimelineTransport(55, 50)).toBe(55);
  });

  it('uses live when pending is null', () => {
    expect(resolveStanzaTimelineTransport(42, null)).toBe(42);
  });
});

describe('stanzaPlayheadDisplayTime', () => {
  it('returns transport time in through mode', () => {
    expect(stanzaPlayheadDisplayTime(42, 120, 'through', null)).toBe(42);
  });

  it('clamps to selection end in loopSelection mode', () => {
    expect(
      stanzaPlayheadDisplayTime(100, 120, 'loopSelection', { start: 10, end: 50 }),
    ).toBeLessThan(50);
    expect(stanzaPlayheadDisplayTime(20, 120, 'loopSelection', { start: 10, end: 50 })).toBe(20);
  });
});
