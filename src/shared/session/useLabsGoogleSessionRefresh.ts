import { useCallback, useEffect, useRef } from 'react';
import {
  isLabsGoogleSessionBffEnabled,
  tryRefreshGoogleAccessTokenViaBff,
} from './labsGoogleSessionPort';
import { readPersistedGoogleSession } from '../google/encoreGoogleTokenStorage';

const PROACTIVE_REFRESH_MARGIN_MS = 5 * 60_000;

/**
 * When the session BFF is enabled, schedule a single proactive refresh shortly before the
 * persisted access token expires. Uses HTTPS fetch only — never GIS.
 */
export function useLabsGoogleSessionRefresh(onRefreshed?: (accessToken: string) => void): void {
  const onRefreshedRef = useRef(onRefreshed);
  onRefreshedRef.current = onRefreshed;

  const runRefresh = useCallback(async () => {
    const token = await tryRefreshGoogleAccessTokenViaBff();
    if (token) onRefreshedRef.current?.(token);
  }, []);

  useEffect(() => {
    if (!isLabsGoogleSessionBffEnabled()) return;

    const schedule = () => {
      const stored = readPersistedGoogleSession();
      if (!stored) return undefined;
      const refreshAtMs = stored.expiresAtMs - PROACTIVE_REFRESH_MARGIN_MS;
      const delayMs = Math.max(0, refreshAtMs - Date.now());
      return window.setTimeout(() => {
        void runRefresh();
      }, delayMs);
    };

    let handle = schedule();
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'encore_google_oauth_v1') return;
      if (handle != null) window.clearTimeout(handle);
      handle = schedule();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      if (handle != null) window.clearTimeout(handle);
      window.removeEventListener('storage', onStorage);
    };
  }, [runRefresh]);
}
