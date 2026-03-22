import { useCallback, useRef } from 'react';
import type { TimeSignature } from '../types';
import { getHistoryUpdateStrategy } from '../../shared/utils/urlHistory';

interface UrlState {
  notation: string;
  timeSignature: TimeSignature;
  bpm: number;
  beatGrouping?: number[];
  metronomeEnabled?: boolean;
}

const URL_PARAM_RHYTHM = 'rhythm';
const URL_PARAM_RHYTHM_B64 = 'r64';

function encodeBase64Url(input: string): string {
  return btoa(input)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64Url(input: string): string | null {
  try {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = `${normalized}${'='.repeat((4 - (normalized.length % 4)) % 4)}`;
    return atob(padded);
  } catch {
    return null;
  }
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

  const notationFromB64 = params.get(URL_PARAM_RHYTHM_B64);
  const decodedNotation = notationFromB64
    ? decodeBase64Url(notationFromB64)
    : null;
  const notation =
    decodedNotation || params.get(URL_PARAM_RHYTHM) || DEFAULT_STATE.notation;
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

const DEBOUNCE_MS = 800;
const REPLACE_DEBOUNCE_PARAMS = new Set([URL_PARAM_RHYTHM, URL_PARAM_RHYTHM_B64, 'bpm']);

function buildUrl(state: UrlState): string {
  const params = new URLSearchParams(window.location.search);

  params.delete(URL_PARAM_RHYTHM);
  params.delete(URL_PARAM_RHYTHM_B64);
  params.delete('bpm');
  params.delete('time');
  params.delete('groups');
  params.delete('metronome');

  if (state.notation !== DEFAULT_STATE.notation) {
    params.set(URL_PARAM_RHYTHM_B64, encodeBase64Url(state.notation));
  }

  if (state.bpm !== DEFAULT_STATE.bpm) {
    params.set('bpm', state.bpm.toString());
  }

  const timeSigString = `${state.timeSignature.numerator}/${state.timeSignature.denominator}`;
  const defaultTimeSigString = `${DEFAULT_STATE.timeSignature.numerator}/${DEFAULT_STATE.timeSignature.denominator}`;
  if (timeSigString !== defaultTimeSigString) {
    params.set('time', timeSigString);
  }

  if (state.beatGrouping && state.beatGrouping.length > 0) {
    params.set('groups', state.beatGrouping.join('+'));
  }

  if (state.metronomeEnabled) {
    params.set('metronome', 'true');
  }

  const queryString = params.toString();
  return queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
}

/**
 * Custom hook to sync app state with URL parameters
 */
export function useUrlState() {
  const lastPushTimeRef = useRef(0);

  const getInitialState = useCallback((): UrlState => {
    return parseUrlParams();
  }, []);

  /**
   * Sync current state to URL. Uses pushState to support back/forward navigation,
   * with a debounce window so rapid changes (e.g. typing BPM) don't flood history.
   */
  const syncToUrl = useCallback((state: UrlState): void => {
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

