import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureLabsGoogleAccessTokenForDrive } from './labsGoogleDriveAccess';
import {
  LABS_ENCORE_GOOGLE_IDENTITY_CHANGED_EVENT,
  readPersistedGoogleIdentity,
  type EncoreGooglePersistedIdentity,
} from './encoreGoogleTokenStorage';

/**
 * True when the two persisted identities carry the same user-visible payload.
 * Used to gate `setIdentity` so an unchanged localStorage read doesn't bump
 * state to a new object reference (which would cascade through dependent
 * effects — notably the silent-token backfill below).
 */
function identityPayloadsEqual(
  a: EncoreGooglePersistedIdentity | null,
  b: EncoreGooglePersistedIdentity | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.email === b.email && a.displayName === b.displayName;
}

/**
 * Re-reads Encore-persisted Google identity when other tabs update `localStorage` or on window focus.
 *
 * Stability note (load-bearing): `setIdentity` is gated by
 * {@link identityPayloadsEqual}. `readPersistedGoogleIdentity` returns a fresh
 * object every call (JSON parse), and any focus / storage event would otherwise
 * push a new reference into state — which re-runs every consumer's `[identity]`
 * effects. The downstream silent-token backfill effect is especially expensive:
 * each run calls the GIS `requestAccessToken({ prompt: 'none' })` flow, which
 * creates an iframe / popup attempt that GIS does not clean up. Without this
 * guard, repeated window focus events leaked GSI iframes (~1 per focus) until
 * the tab ran out of memory.
 */
export function useLabsEncoreGoogleIdentity(): EncoreGooglePersistedIdentity | null {
  const [identity, setIdentity] = useState<EncoreGooglePersistedIdentity | null>(() =>
    typeof window === 'undefined' ? null : readPersistedGoogleIdentity(),
  );

  const refresh = useCallback(() => {
    setIdentity((prev) => {
      const next = readPersistedGoogleIdentity();
      return identityPayloadsEqual(prev, next) ? prev : next;
    });
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

  /**
   * One-shot backfill of `encore_google_identity_v1` when a Drive-capable session
   * exists but identity was never written (e.g. older GIS-only writes).
   *
   * We attempt the silent token request **at most once per page load** (gated by
   * `silentBackfillAttemptedRef`). GIS leaks an iframe per silent attempt and
   * the call is best-effort — if it fails the user can still sign in
   * interactively from the account menu, so retrying on every focus is wasteful
   * and was the root cause of a tab-killing GSI iframe leak.
   */
  const silentBackfillAttemptedRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (silentBackfillAttemptedRef.current) return;
    if (identity?.email?.trim()) return;
    if (!((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '').trim()) return;

    silentBackfillAttemptedRef.current = true;
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
