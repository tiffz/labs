import { useCallback, useEffect, useState } from 'react';
import {
  ENCORE_GOOGLE_SESSION_STORAGE_KEY,
  isPersistedSessionStillFresh,
  LABS_ENCORE_GOOGLE_IDENTITY_CHANGED_EVENT,
  readPersistedGoogleSession,
} from './encoreGoogleTokenStorage';

function computeLabsGoogleDriveNeedsSignIn(hasPersistedIdentity: boolean): boolean {
  if (!hasPersistedIdentity) return false;
  const session = readPersistedGoogleSession();
  if (!session) return true;
  return !isPersistedSessionStillFresh(session);
}

/**
 * True when the user has a remembered Labs Google identity but no fresh access token
 * (Drive sync paused until they sign in again from a button click).
 */
export function useLabsGoogleDriveNeedsSignIn(hasPersistedIdentity: boolean): boolean {
  const [needsSignIn, setNeedsSignIn] = useState(() =>
    computeLabsGoogleDriveNeedsSignIn(hasPersistedIdentity),
  );

  const refresh = useCallback(() => {
    setNeedsSignIn((prev) => {
      const next = computeLabsGoogleDriveNeedsSignIn(hasPersistedIdentity);
      return prev === next ? prev : next;
    });
  }, [hasPersistedIdentity]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === ENCORE_GOOGLE_SESSION_STORAGE_KEY || e.key === 'encore_google_identity_v1') refresh();
    };
    const onSameTab = () => refresh();
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', refresh);
    window.addEventListener(LABS_ENCORE_GOOGLE_IDENTITY_CHANGED_EVENT, onSameTab);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', refresh);
      window.removeEventListener(LABS_ENCORE_GOOGLE_IDENTITY_CHANGED_EVENT, onSameTab);
    };
  }, [refresh]);

  return needsSignIn;
}
