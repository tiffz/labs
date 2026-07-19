import { useCallback, useEffect, useRef } from 'react';
import {
  isLabsGoogleSessionBffEnabled,
  tryRefreshGoogleAccessTokenViaBff,
} from './labsGoogleSessionPort';
import { readPersistedGoogleSession } from '../google/encoreGoogleTokenStorage';

const PROACTIVE_REFRESH_MARGIN_MS = 5 * 60_000;
/** After a failed proactive refresh, retry with backoff instead of going dormant. */
const RETRY_DELAY_MS = 5 * 60_000;
const CROSS_TAB_LOCK_NAME = 'labs_google_session_refresh';

/**
 * When the session BFF is enabled, schedule proactive refreshes shortly before the
 * persisted access token expires. Uses HTTPS fetch only — never GIS.
 *
 * - **Re-arms itself**: after every attempt (success or failure) the next timer is
 *   scheduled from the freshly persisted session, so a long-lived tab keeps its
 *   session alive across many token lifetimes (previously the timer fired once and
 *   only re-armed on cross-tab storage events).
 * - **Cross-tab single-flight**: `navigator.locks` ensures only one tab refreshes;
 *   the others see the new token via the `storage` event and just re-schedule.
 */
export function useLabsGoogleSessionRefresh(onRefreshed?: (accessToken: string) => void): void {
  const onRefreshedRef = useRef(onRefreshed);
  onRefreshedRef.current = onRefreshed;

  const runRefresh = useCallback(async (): Promise<boolean> => {
    const attempt = async () => {
      // Another tab may have refreshed while we waited on the lock.
      const stored = readPersistedGoogleSession();
      if (stored && stored.expiresAtMs - Date.now() > PROACTIVE_REFRESH_MARGIN_MS) {
        return true;
      }
      const token = await tryRefreshGoogleAccessTokenViaBff();
      if (token) onRefreshedRef.current?.(token);
      return token != null;
    };
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request(CROSS_TAB_LOCK_NAME, attempt);
    }
    return attempt();
  }, []);

  useEffect(() => {
    if (!isLabsGoogleSessionBffEnabled()) return;

    let handle: number | undefined;
    let disposed = false;

    const schedule = (delayOverrideMs?: number) => {
      if (disposed) return;
      if (handle != null) window.clearTimeout(handle);
      const stored = readPersistedGoogleSession();
      if (!stored) {
        handle = undefined;
        return;
      }
      const refreshAtMs = stored.expiresAtMs - PROACTIVE_REFRESH_MARGIN_MS;
      const delayMs = delayOverrideMs ?? Math.max(0, refreshAtMs - Date.now());
      handle = window.setTimeout(() => {
        void runRefresh().then((ok) => {
          // Success: persisted expiry moved forward, schedule the next cycle.
          // Failure: retry with a fixed backoff while the session persists.
          schedule(ok ? undefined : RETRY_DELAY_MS);
        });
      }, delayMs);
    };

    schedule();
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'encore_google_oauth_v1') return;
      schedule();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      disposed = true;
      if (handle != null) window.clearTimeout(handle);
      window.removeEventListener('storage', onStorage);
    };
  }, [runRefresh]);
}
