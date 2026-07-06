import type { MetronomePreferences } from './preferences';

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Apply an app-level metronome bus gain (0–1 mix slider) on top of advanced-panel Overall volume.
 * Matches rhythm playback: legacyMetVolume × prefs.masterVolume.
 */
export function applyMetronomeBusGain(
  preferences: MetronomePreferences,
  busGain0to1: number,
): MetronomePreferences {
  const bus100 = clamp100(Math.max(0, Math.min(1, busGain0to1)) * 100);
  const combined = clamp100((bus100 / 100) * (preferences.masterVolume / 100) * 100);
  return { ...preferences, masterVolume: combined };
}
