import { useCallback, useMemo, useState } from 'react';
import type { TimeSignature } from '../../../rhythm/types';
import {
  decodeMetronomePreferences,
  defaultMetronomePreferences,
  encodeMetronomePreferences,
  getPlaybackAppDefaultSubdivisionLevel,
  isMetronomeNonDefault,
  PLAYBACK_APP_METRONOME_DEFAULTS,
  type MetronomePreferences,
} from './preferences';

export type UseMetronomePreferencesOptions = {
  storageKey?: string;
  timeSignature?: TimeSignature;
  appDefaults?: Partial<MetronomePreferences>;
  onPersist?: (prefs: MetronomePreferences) => void;
};

export function useMetronomePreferences(options: UseMetronomePreferencesOptions = {}) {
  const { storageKey, onPersist, appDefaults } = options;
  const timeSignature = useMemo(
    () => options.timeSignature ?? { numerator: 4, denominator: 4 },
    [options.timeSignature],
  );
  const baseline = useMemo(
    () =>
      defaultMetronomePreferences(timeSignature, {
        ...PLAYBACK_APP_METRONOME_DEFAULTS,
        subdivisionLevel: getPlaybackAppDefaultSubdivisionLevel(timeSignature),
        ...appDefaults,
      }),
    [timeSignature, appDefaults],
  );

  const [preferences, setPreferencesState] = useState<MetronomePreferences>(() => {
    if (storageKey && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const decoded = decodeMetronomePreferences(stored, baseline);
        if (decoded) return decoded;
      }
    }
    return baseline;
  });

  const setPreferences = useCallback(
    (next: MetronomePreferences | ((prev: MetronomePreferences) => MetronomePreferences)) => {
      setPreferencesState((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        if (storageKey && typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(storageKey, encodeMetronomePreferences(resolved));
          } catch {
            /* quota */
          }
        }
        onPersist?.(resolved);
        return resolved;
      });
    },
    [storageKey, onPersist],
  );

  const patchPreferences = useCallback(
    (patch: Partial<MetronomePreferences>) => {
      setPreferences((prev) => ({ ...prev, ...patch }));
    },
    [setPreferences],
  );

  const isNonDefault = useMemo(
    () => isMetronomeNonDefault(preferences, baseline),
    [preferences, baseline],
  );

  return {
    preferences,
    baseline,
    setPreferences,
    patchPreferences,
    isNonDefault,
  };
}
