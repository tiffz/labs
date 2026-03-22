/**
 * URL state synchronization for Chord Progression Generator
 * Syncs progression, key, tempo, time signature, and styling to URL parameters
 */

import { useCallback, useRef } from 'react';
import type {
  ChordProgressionState,
  Key,
  ChordStylingStrategy,
} from '../types';
import { COMMON_CHORD_PROGRESSIONS } from '../data/chordProgressions';
import { CHORD_STYLING_STRATEGIES } from '../data/chordStylingStrategies';
import { ALL_KEYS } from '../utils/randomization';
import { getHistoryUpdateStrategy } from '../../shared/utils/urlHistory';
import { parseProgressionText } from '../../shared/music/chordProgressionText';

/**
 * Parse URL parameters into app state
 */
function parseUrlParams(): Partial<ChordProgressionState> | null {
  const params = new URLSearchParams(window.location.search);

  const result: Partial<ChordProgressionState> = {};

  // Parse progression
  const progressionParam = params.get('progression');
  const progressionTextParam = params.get('progressionText');
  if (progressionParam) {
    const progression = COMMON_CHORD_PROGRESSIONS.find(
      (p) => p.name === progressionParam
    );
    if (progression) {
      result.progression = progression;
    }
  }

  // Parse key
  const keyParam = params.get('key');
  if (keyParam && ALL_KEYS.includes(keyParam as Key)) {
    result.key = keyParam as Key;
  }

  // Parse custom progression text (supports roman numerals or chord symbols).
  if (progressionTextParam) {
    const parsed = parseProgressionText(
      progressionTextParam,
      (result.key ?? 'C') as Key
    );
    if (parsed.isValid && parsed.romanNumerals.length >= 2) {
      result.progression = {
        name: 'Custom progression',
        progression: parsed.romanNumerals,
      };
      if (parsed.inferredKey) {
        result.key = parsed.inferredKey;
      }
    }
  }

  // Parse tempo
  const tempoParam = params.get('tempo');
  if (tempoParam) {
    const tempo = parseInt(tempoParam, 10);
    if (!isNaN(tempo) && tempo >= 20 && tempo <= 300) {
      result.tempo = tempo;
    }
  }

  // Parse time signature (format: "4/4")
  const timeSigParam = params.get('time');
  if (timeSigParam) {
    const parts = timeSigParam.split('/');
    if (parts.length === 2) {
      const numerator = parseInt(parts[0], 10);
      const denominator = parseInt(parts[1], 10);
      if (!isNaN(numerator) && !isNaN(denominator) && denominator > 0) {
        result.timeSignature = { numerator, denominator };
      }
    }
  }

  // Parse styling strategy
  const stylingParam = params.get('styling');
  if (stylingParam && stylingParam in CHORD_STYLING_STRATEGIES) {
    result.stylingStrategy = stylingParam as ChordStylingStrategy;
  }

  // Parse measures per chord
  const measuresPerChordParam = params.get('measuresPerChord');
  if (measuresPerChordParam) {
    const measuresPerChord = parseInt(measuresPerChordParam, 10);
    if (
      !isNaN(measuresPerChord) &&
      measuresPerChord >= 1 &&
      measuresPerChord <= 4
    ) {
      result.measuresPerChord = measuresPerChord;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

const DEBOUNCE_MS = 800;
const REPLACE_DEBOUNCE_PARAMS = new Set(['tempo']);

function buildUrl(state: ChordProgressionState): string {
  const params: string[] = [];

  if (state.progression?.name) {
    const isPreset = COMMON_CHORD_PROGRESSIONS.some(
      (p) => p.name === state.progression.name
    );
    if (isPreset) {
      params.push(`progression=${encodeURIComponent(state.progression.name)}`);
    } else if (state.progression.progression.length > 0) {
      params.push(
        `progressionText=${encodeURIComponent(state.progression.progression.join('–'))}`
      );
    }
  }

  if (state.key) {
    params.push(`key=${encodeURIComponent(state.key)}`);
  }

  if (state.tempo) {
    params.push(`tempo=${state.tempo}`);
  }

  if (state.timeSignature) {
    const timeSigString = `${state.timeSignature.numerator}/${state.timeSignature.denominator}`;
    params.push(`time=${encodeURIComponent(timeSigString)}`);
  }

  if (state.stylingStrategy) {
    params.push(`styling=${encodeURIComponent(state.stylingStrategy)}`);
  }

  if (state.measuresPerChord && state.measuresPerChord !== 1) {
    params.push(`measuresPerChord=${state.measuresPerChord}`);
  }

  return params.length > 0
    ? `${window.location.pathname}?${params.join('&')}`
    : window.location.pathname;
}

/**
 * Custom hook to sync app state with URL parameters
 */
export function useUrlState() {
  const lastPushTimeRef = useRef(0);

  const getInitialState =
    useCallback((): Partial<ChordProgressionState> | null => {
      return parseUrlParams();
    }, []);

  /**
   * Sync current state to URL. Uses pushState to support back/forward navigation,
   * with a debounce window so rapid changes (e.g. typing tempo) don't flood history.
   */
  const syncToUrl = useCallback((state: ChordProgressionState): void => {
    const newUrl = buildUrl(state);
    const currentUrl = window.location.pathname + window.location.search;
    const now = Date.now();
    const strategy = getHistoryUpdateStrategy({
      currentUrl,
      newUrl,
      now,
      lastPushTime: lastPushTimeRef.current,
      debounceMs: DEBOUNCE_MS,
      replaceDebounceParams: REPLACE_DEBOUNCE_PARAMS,
    });

    if (strategy === 'skip') return;
    if (strategy === 'replace') {
      window.history.replaceState({}, '', newUrl);
    } else {
      window.history.pushState({}, '', newUrl);
      lastPushTimeRef.current = now;
    }
  }, []);

  /**
   * Listen for browser back/forward navigation
   */
  const setupPopStateListener = useCallback(
    (onStateChange: (state: Partial<ChordProgressionState> | null) => void) => {
      const handlePopState = () => {
        const newState = parseUrlParams();
        onStateChange(newState);
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    },
    []
  );

  return {
    getInitialState,
    syncToUrl,
    setupPopStateListener,
  };
}
