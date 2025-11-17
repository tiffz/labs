import { useCallback } from 'react';
import type { TimeSignature } from '../types';

interface UrlState {
  notation: string;
  timeSignature: TimeSignature;
  bpm: number;
  beatGrouping?: number[];
  metronomeEnabled?: boolean;
}

const DEFAULT_STATE: UrlState = {
  notation: 'D-T-__T-D---T---', // Maqsum
  timeSignature: { numerator: 4, denominator: 4 },
  bpm: 120,
  beatGrouping: undefined,
  metronomeEnabled: false,
};

/**
 * Parse URL parameters into app state
 */
function parseUrlParams(): UrlState {
  const params = new URLSearchParams(window.location.search);
  
  const notation = params.get('rhythm') || DEFAULT_STATE.notation;
  const bpm = parseInt(params.get('bpm') || '', 10) || DEFAULT_STATE.bpm;
  
  // Parse time signature (format: "4/4")
  const timeSigParam = params.get('time');
  let timeSignature = DEFAULT_STATE.timeSignature;
  
  if (timeSigParam) {
    const parts = timeSigParam.split('/');
    if (parts.length === 2) {
      const numerator = parseInt(parts[0], 10);
      const denominator = parseInt(parts[1], 10);
      if (!isNaN(numerator) && !isNaN(denominator) && denominator > 0) {
        timeSignature = { numerator, denominator };
      }
    }
  }
  
  // Parse beat grouping (format: "3+3+2")
  const groupsParam = params.get('groups');
  let beatGrouping: number[] | undefined = undefined;
  
  if (groupsParam) {
    const parts = groupsParam.split('+').map(s => parseInt(s.trim(), 10));
    if (parts.every(n => !isNaN(n) && n > 0)) {
      beatGrouping = parts;
    }
  }
  
  // Parse metronome enabled (format: "true" or "1")
  const metronomeParam = params.get('metronome');
  const metronomeEnabled = metronomeParam === 'true' || metronomeParam === '1';
  
  return { notation, timeSignature, bpm, beatGrouping, metronomeEnabled };
}

/**
 * Update URL parameters without triggering a page reload
 */
function updateUrlParams(state: UrlState): void {
  const params: string[] = [];
  
  // Only add params if they differ from defaults
  if (state.notation !== DEFAULT_STATE.notation) {
    params.push(`rhythm=${encodeURIComponent(state.notation)}`);
  }
  
  if (state.bpm !== DEFAULT_STATE.bpm) {
    params.push(`bpm=${state.bpm}`);
  }
  
  const timeSigString = `${state.timeSignature.numerator}/${state.timeSignature.denominator}`;
  const defaultTimeSigString = `${DEFAULT_STATE.timeSignature.numerator}/${DEFAULT_STATE.timeSignature.denominator}`;
  if (timeSigString !== defaultTimeSigString) {
    params.push(`time=${encodeURIComponent(timeSigString)}`);
  }
  
  // Add beat grouping if present - manually encode to preserve + signs
  if (state.beatGrouping && state.beatGrouping.length > 0) {
    const groupsString = state.beatGrouping.join('+');
    params.push(`groups=${encodeURIComponent(groupsString)}`);
  }
  
  // Add metronome state if enabled (only add if true to keep URL clean)
  if (state.metronomeEnabled) {
    params.push('metronome=true');
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
  const getInitialState = useCallback((): UrlState => {
    return parseUrlParams();
  }, []);
  
  /**
   * Sync current state to URL
   */
  const syncToUrl = useCallback((state: UrlState): void => {
    updateUrlParams(state);
  }, []);
  
  /**
   * Listen for browser back/forward navigation
   */
  const setupPopStateListener = useCallback((onStateChange: (state: UrlState) => void) => {
    const handlePopState = () => {
      const newState = parseUrlParams();
      onStateChange(newState);
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

