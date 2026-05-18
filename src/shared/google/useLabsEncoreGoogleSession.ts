import { useCallback, useEffect, useState } from 'react';
import {
  LABS_ENCORE_GOOGLE_IDENTITY_CHANGED_EVENT,
  readPersistedGoogleIdentity,
  type EncoreGooglePersistedIdentity,
} from './encoreGoogleTokenStorage';

/**
 * True when the two persisted identities carry the same user-visible payload.
 * Used to gate `setIdentity` so an unchanged localStorage read doesn't bump
 * state to a new object reference (which would cascade through dependent
 * effects).
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
 * Re-reads Encore-persisted Google identity from `localStorage` on sibling-tab `storage` events,
 * window `focus`, and same-tab custom events. **Never** calls Google Identity Services — see
 * [ADR 0011](../../../docs/adr/0011-labs-stanza-scales-no-background-google-refresh.md).
 *
 * Stability note (load-bearing): `setIdentity` is gated by {@link identityPayloadsEqual}.
 * `readPersistedGoogleIdentity` returns a fresh object every call (JSON parse); without this
 * guard, repeated focus / storage events would push a new reference into state on every fire,
 * thrashing downstream consumers.
 *
 * History: this hook previously fired a one-shot silent `prompt: 'none'` token request on mount
 * to "backfill" an identity when none was persisted yet. That path was the documented source of
 * ghost iframes / phantom popups across Stanza / Scales tabs (the GIS hidden iframe leaks one
 * per silent attempt). Per ADR 0011 the backfill was removed: users now click Sign in once when
 * the persisted identity is missing or expired.
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
    // No mount-time refresh: the `useState` initializer above already reads localStorage on the
    // very first render, so a second read here would queue a redundant no-op setState (the
    // payload-equality gate would bail, but React still treats it as a queued update). The
    // listeners below cover everything that can change after mount.
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

  return identity;
}
