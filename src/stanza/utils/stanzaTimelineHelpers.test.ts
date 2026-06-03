import { describe, expect, it } from 'vitest';
import { formatStanzaTimelineClock } from './stanzaTimelineHelpers';

describe('formatStanzaTimelineClock', () => {
  it('formats minutes and zero-padded seconds', () => {
    expect(formatStanzaTimelineClock(0)).toBe('0:00');
    expect(formatStanzaTimelineClock(65)).toBe('1:05');
    expect(formatStanzaTimelineClock(599)).toBe('9:59');
  });

  it('guards non-finite input', () => {
    expect(formatStanzaTimelineClock(Number.NaN)).toBe('0:00');
    expect(formatStanzaTimelineClock(-1)).toBe('0:00');
  });
});
