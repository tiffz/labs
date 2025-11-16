import { useCallback } from 'react';
import type { TimeSignature } from '../types';

interface UrlState {
  notation: string;
  timeSignature: TimeSignature;
  bpm: number;
}

const DEFAULT_STATE: UrlState = {
  notation: 'D-T-__T-D---T---', // Maqsum
  timeSignature: { numerator: 4, denominator: 4 },
  bpm: 120,
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
  
  return { notation, timeSignature, bpm };
}

/**
 * Update URL parameters without triggering a page reload
 */
function updateUrlParams(state: UrlState): void {
  const params = new URLSearchParams();
  
  // Only add params if they differ from defaults
  if (state.notation !== DEFAULT_STATE.notation) {
    params.set('rhythm', state.notation);
  }
  
  if (state.bpm !== DEFAULT_STATE.bpm) {
    params.set('bpm', state.bpm.toString());
  }
  
  const timeSigString = `${state.timeSignature.numerator}/${state.timeSignature.denominator}`;
  const defaultTimeSigString = `${DEFAULT_STATE.timeSignature.numerator}/${DEFAULT_STATE.timeSignature.denominator}`;
  if (timeSigString !== defaultTimeSigString) {
    params.set('time', timeSigString);
  }
  
  // Update URL without reloading
  const newUrl = params.toString() 
    ? `${window.location.pathname}?${params.toString()}`
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

