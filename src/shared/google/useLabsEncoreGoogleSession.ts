import { useCallback, useEffect, useState } from 'react';
import { ensureLabsGoogleAccessTokenForDrive } from './labsGoogleDriveAccess';
import {
  LABS_ENCORE_GOOGLE_IDENTITY_CHANGED_EVENT,
  readPersistedGoogleIdentity,
  type EncoreGooglePersistedIdentity,
} from './encoreGoogleTokenStorage';

/**
 * Re-reads Encore-persisted Google identity when other tabs update `localStorage` or on window focus.
 */
export function useLabsEncoreGoogleIdentity(): EncoreGooglePersistedIdentity | null {
  const [identity, setIdentity] = useState<EncoreGooglePersistedIdentity | null>(() =>
    typeof window === 'undefined' ? null : readPersistedGoogleIdentity(),
  );

  const refresh = useCallback(() => {
    setIdentity(readPersistedGoogleIdentity());
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'encore_google_identity_v1' || e.key === 'encore_google_oauth_v1') refresh();
    };
    const onSameTabIdentity = () => refresh();
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', refresh);
    window.addEventListener(LABS_ENCORE_GOOGLE_IDENTITY_CHANGED_EVENT, onSameTabIdentity);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', refresh);
      window.removeEventListener(LABS_ENCORE_GOOGLE_IDENTITY_CHANGED_EVENT, onSameTabIdentity);
    };
  }, [refresh]);

  /** Backfill `encore_google_identity_v1` when a Drive-capable session exists but identity was never written (e.g. older GIS-only writes). */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (identity?.email?.trim()) return;
    if (!((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '').trim()) return;

    void (async () => {
      try {
        await ensureLabsGoogleAccessTokenForDrive({ interactive: false });
      } catch {
        /* Missing/expired token or GIS needs a gesture — account menu stays hidden until Encore or a signed action */
      }
    })();
  }, [identity?.email]);

  return identity;
}
