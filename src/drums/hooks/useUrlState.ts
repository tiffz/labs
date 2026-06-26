import { useCallback, useRef } from 'react';
import type { DrumsUrlState } from '../routes/drumsAppUrl';
import { buildDrumsAppUrl, parseDrumsUrlParams } from '../routes/drumsAppUrl';
import { getHistoryUpdateStrategy, throttledReplaceState, throttledPushState } from '../../shared/utils/urlHistory';

const URL_PARAM_RHYTHM = 'rhythm';
const DEBOUNCE_MS = 800;
const REPLACE_DEBOUNCE_PARAMS = new Set([URL_PARAM_RHYTHM, 'bpm']);

/**
 * Custom hook to sync app state with URL parameters
 */
export function useUrlState() {
  const lastPushTimeRef = useRef(0);

  const getInitialState = useCallback((): DrumsUrlState => {
    return parseDrumsUrlParams();
  }, []);

  /**
   * Sync current state to URL. Uses pushState to support back/forward navigation,
   * with a debounce window so rapid changes (e.g. typing BPM) don't flood history.
   */
  const syncToUrl = useCallback((state: DrumsUrlState): void => {
    const newUrl = buildDrumsAppUrl(state);
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
      throttledReplaceState(newUrl);
    } else {
      throttledPushState(newUrl);
      lastPushTimeRef.current = now;
    }
  }, []);

  /**
   * Listen for browser back/forward navigation
   */
  const setupPopStateListener = useCallback((onStateChange: (state: DrumsUrlState) => void) => {
    const handlePopState = () => {
      const newState = parseDrumsUrlParams();
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
