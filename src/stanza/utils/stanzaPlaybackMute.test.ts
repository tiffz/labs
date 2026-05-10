import { describe, expect, it } from 'vitest';
import { primaryPlaybackMuted, stanzaSanitizeLinearBusGain, stemPlaybackMuted } from './stanzaPlaybackMute';

describe('stanzaPlaybackMute', () => {
  it('stemPlaybackMuted is strict', () => {
    expect(stemPlaybackMuted({ muted: true })).toBe(true);
    expect(stemPlaybackMuted({ muted: false })).toBe(false);
    expect(stemPlaybackMuted({ muted: undefined })).toBe(false);
    expect(stemPlaybackMuted({ muted: 'false' as unknown as boolean })).toBe(false);
    expect(stemPlaybackMuted({ muted: 'true' as unknown as boolean })).toBe(false);
  });

  it('primaryPlaybackMuted is strict', () => {
    expect(primaryPlaybackMuted({ primaryMuted: true })).toBe(true);
    expect(primaryPlaybackMuted({ primaryMuted: false })).toBe(false);
    expect(primaryPlaybackMuted(null)).toBe(false);
    expect(primaryPlaybackMuted({ primaryMuted: 'false' as unknown as boolean })).toBe(false);
  });

  it('stanzaSanitizeLinearBusGain rejects NaN and clamps', () => {
    expect(stanzaSanitizeLinearBusGain(undefined)).toBe(1);
    expect(stanzaSanitizeLinearBusGain(Number.NaN)).toBe(1);
    expect(stanzaSanitizeLinearBusGain(Number.POSITIVE_INFINITY)).toBe(1);
    expect(stanzaSanitizeLinearBusGain(-3)).toBe(0);
    expect(stanzaSanitizeLinearBusGain(0.4)).toBe(0.4);
  });
});
