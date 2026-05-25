import { describe, expect, it } from 'vitest';
import { computeStanzaLocalMediaFingerprint } from './stanzaLocalMediaFingerprint';

describe('computeStanzaLocalMediaFingerprint', () => {
  it('uses size and duration when duration is known', () => {
    expect(computeStanzaLocalMediaFingerprint({ sizeBytes: 12345, durationSec: 180.004 })).toBe('12345:180.00');
  });

  it('falls back to file name when duration is missing', () => {
    expect(computeStanzaLocalMediaFingerprint({ sizeBytes: 999, fileName: 'Take.mp4' })).toBe('999:name:take.mp4');
  });
});
