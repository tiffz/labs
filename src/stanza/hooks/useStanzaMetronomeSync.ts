import type { TimeSignature } from '../../shared/rhythm/types';
import {
  usePlatformMediaMetronome,
  primePlatformMetronomeAudio,
  type UsePlatformMediaMetronomeOptions,
} from '../../shared/audio/platform/hooks/usePlatformMediaMetronome';
import {
  defaultMetronomePreferences,
  type MetronomePreferences,
} from '../../shared/audio/platform/metronome/preferences';
import { applyMetronomeBusGain } from '../../shared/audio/platform/metronome/metronomeBusGain';
import { useMemo } from 'react';

export { primePlatformMetronomeAudio as primeStanzaMetronomeAudio };

export interface UseStanzaMetronomeSyncOptions {
  enabled: boolean;
  bpm: number | undefined;
  anchorMediaTime: number | undefined;
  getMediaTime: () => number;
  isPlaying: boolean;
  audioEnabled: boolean;
  /** Linear 0–1 multiplier — maps to platform metronome masterVolume. */
  gain: number;
  muted: boolean;
  timeSignature?: TimeSignature;
  /** Advanced metronome preferences (optional). */
  preferences?: MetronomePreferences;
}

/**
 * Stanza media-slaved metronome — delegates to shared platform scheduler.
 * @deprecated Import usePlatformMediaMetronome directly for new code.
 */
export function useStanzaMetronomeSync(opts: UseStanzaMetronomeSyncOptions): void {
  const timeSignature = useMemo(
    () => opts.timeSignature ?? { numerator: 4, denominator: 4 },
    [opts.timeSignature],
  );
  const preferences = useMemo(() => {
    const base =
      opts.preferences ??
      defaultMetronomePreferences(timeSignature, {
        sourceEnabled: { voice: false, click: true, drum: false },
      });
    return applyMetronomeBusGain(base, opts.gain);
  }, [opts.preferences, opts.gain, timeSignature]);

  const platformOpts: UsePlatformMediaMetronomeOptions = {
    enabled: opts.enabled,
    bpm: opts.bpm,
    timeSignature,
    anchorMediaTime: opts.anchorMediaTime,
    getMediaTime: opts.getMediaTime,
    isPlaying: opts.isPlaying,
    audioEnabled: opts.audioEnabled,
    preferences,
    muted: opts.muted,
  };

  usePlatformMediaMetronome(platformOpts);
}
