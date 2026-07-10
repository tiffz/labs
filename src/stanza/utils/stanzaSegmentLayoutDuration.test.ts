import { describe, expect, it } from 'vitest';
import { stanzaSegmentLayoutDuration } from './stanzaSegmentLayoutDuration';

describe('stanzaSegmentLayoutDuration', () => {
  it('uses playback duration when markers and fingerprint are absent', () => {
    expect(stanzaSegmentLayoutDuration({ markers: [], playbackDuration: 120 })).toBe(120);
  });

  it('keeps section layout when playback resets to zero after attaching local audio', () => {
    expect(
      stanzaSegmentLayoutDuration({
        markers: [
          { time: 30, label: 'Verse' },
          { time: 90, label: 'Chorus' },
        ],
        playbackDuration: 0,
        localMediaFingerprint: '12345:180.00',
      }),
    ).toBe(180);
  });

  it('extends layout past a shorter local file so YouTube markers stay visible', () => {
    expect(
      stanzaSegmentLayoutDuration({
        markers: [{ time: 200, label: 'Bridge' }],
        playbackDuration: 150,
        localMediaFingerprint: '999:150.00',
      }),
    ).toBeGreaterThanOrEqual(200);
  });
});
