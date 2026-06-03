import { describe, expect, it } from 'vitest';
import {
  computeStanzaLocalMediaFingerprint,
  stanzaLocalMediaFingerprintsMatch,
} from './stanzaLocalMediaFingerprint';

describe('computeStanzaLocalMediaFingerprint', () => {
  it('uses size and duration when duration is known', () => {
    expect(computeStanzaLocalMediaFingerprint({ sizeBytes: 12345, durationSec: 180.004 })).toBe('12345:180.00');
  });

  it('falls back to file name when duration is missing', () => {
    expect(computeStanzaLocalMediaFingerprint({ sizeBytes: 999, fileName: 'Take.mp4' })).toBe('999:name:take.mp4');
  });
});

describe('stanzaLocalMediaFingerprintsMatch', () => {
  it('matches exact fingerprints', () => {
    expect(stanzaLocalMediaFingerprintsMatch('12345:180.00', '12345:180.00')).toBe(true);
  });

  it('matches duration and name keys with the same byte size (cross-device drift)', () => {
    expect(stanzaLocalMediaFingerprintsMatch('12345:180.00', '12345:name:blue.mp3')).toBe(true);
  });

  it('rejects different byte sizes', () => {
    expect(stanzaLocalMediaFingerprintsMatch('12345:180.00', '99999:180.00')).toBe(false);
  });

  it('rejects same-size files with different duration keys', () => {
    expect(stanzaLocalMediaFingerprintsMatch('12345:180.00', '12345:200.00')).toBe(false);
  });

  it('rejects same-size files with different name keys', () => {
    expect(stanzaLocalMediaFingerprintsMatch('12345:name:a.mp3', '12345:name:b.mp3')).toBe(false);
  });
});
