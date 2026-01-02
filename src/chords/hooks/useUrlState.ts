/**
 * URL state synchronization for Chord Progression Generator
 * Syncs progression, key, tempo, time signature, and styling to URL parameters
 */

import { useCallback } from 'react';
import type { ChordProgressionState, Key, ChordStylingStrategy } from '../types';
import { COMMON_CHORD_PROGRESSIONS } from '../data/chordProgressions';
import { CHORD_STYLING_STRATEGIES } from '../data/chordStylingStrategies';
import { ALL_KEYS } from '../utils/randomization';


/**
 * Parse URL parameters into app state
 */
function parseUrlParams(): Partial<ChordProgressionState> | null {
  const params = new URLSearchParams(window.location.search);
  
  const result: Partial<ChordProgressionState> = {};
  
  // Parse progression
  const progressionParam = params.get('progression');
  if (progressionParam) {
    const progression = COMMON_CHORD_PROGRESSIONS.find(p => p.name === progressionParam);
    if (progression) {
      result.progression = progression;
    }
  }
  
  // Parse key
  const keyParam = params.get('key');
  if (keyParam && ALL_KEYS.includes(keyParam as Key)) {
    result.key = keyParam as Key;
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
    if (!isNaN(measuresPerChord) && measuresPerChord >= 1 && measuresPerChord <= 4) {
      result.measuresPerChord = measuresPerChord;
    }
  }
  
  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Update URL parameters without triggering a page reload
 */
function updateUrlParams(state: ChordProgressionState): void {
  const params: string[] = [];
  
  // Add progression
  if (state.progression?.name) {
    params.push(`progression=${encodeURIComponent(state.progression.name)}`);
  }
  
  // Add key
  if (state.key) {
    params.push(`key=${encodeURIComponent(state.key)}`);
  }
  
  // Add tempo
  if (state.tempo) {
    params.push(`tempo=${state.tempo}`);
  }
  
  // Add time signature
  if (state.timeSignature) {
    const timeSigString = `${state.timeSignature.numerator}/${state.timeSignature.denominator}`;
    params.push(`time=${encodeURIComponent(timeSigString)}`);
  }
  
  // Add styling strategy
  if (state.stylingStrategy) {
    params.push(`styling=${encodeURIComponent(state.stylingStrategy)}`);
  }
  
  // Add measures per chord (only if not default value of 1)
  if (state.measuresPerChord && state.measuresPerChord !== 1) {
    params.push(`measuresPerChord=${state.measuresPerChord}`);
  }
  
  // Update URL without reloading
  const newUrl = params.length > 0
    ? `${window.location.pathname}?${params.join('&')}`
    : window.location.pathname;
  
  window.history.replaceState({}, '', newUrl);
}

/**
 * Custom hook to sync app state with URL parameters
 */
export function useUrlState() {
  /**
   * Get initial state from URL on mount
   */
  const getInitialState = useCallback((): Partial<ChordProgressionState> | null => {
    return parseUrlParams();
  }, []);
  
  /**
   * Sync current state to URL
   */
  const syncToUrl = useCallback((state: ChordProgressionState): void => {
    updateUrlParams(state);
  }, []);
  
  /**
   * Listen for browser back/forward navigation
   */
  const setupPopStateListener = useCallback((onStateChange: (state: Partial<ChordProgressionState>) => void) => {
    const handlePopState = () => {
      const newState = parseUrlParams();
      if (newState) {
        onStateChange(newState);
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  return {
    getInitialState,
    syncToUrl,
    setupPopStateListener,
  };
}

