/* Provider + hook share module state; Fast Refresh split not worth the import churn. */
/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from 'react';
import { fetchGoogleUserProfile, friendlyGoogleDisplayName } from '../auth/loadGisScript';
import {
  clearPersistedGoogleIdentity,
  clearPersistedGoogleSession,
  ENCORE_GOOGLE_SESSION_STORAGE_KEY,
  isLikelyGoogleAuthRejection,
  isPersistedSessionStillFresh,
  readPersistedGoogleIdentity,
  readPersistedGoogleSession,
  writePersistedGoogleIdentity,
  writePersistedGoogleSession,
} from '../auth/encoreGoogleTokenStorage';
import { requestGoogleAccessToken, revokeGoogleAccessTokenBestEffort } from '../auth/googleTokenClient';
import {
  isEmailHashAllowed,
  parseAllowedEmailHashesFromEnv,
  sha256HexOfEmail,
} from '../auth/hashEmail';
import {
  ENCORE_SPOTIFY_SESSION_EVENT,
  clearSpotifyToken,
  hasUsableSpotifyTokenBundle,
} from '../spotify/pkce';
import { SpotifyPrivacyAckDialog } from '../components/SpotifyPrivacyAckDialog';
import { hasSpotifyPrivacyAck, setSpotifyPrivacyAck } from '../spotify/spotifyPrivacyAck';
import { startSpotifyOAuthFlow } from '../spotify/startSpotifyOAuthFlow';
import { useLabsUndo } from '../../shared/undo/LabsUndoContext';
import {
  isLabsGoogleSessionBffEnabled,
  isRecoverableBffSignInFailure,
  persistLabsGoogleBffSession,
  signInWithGoogleViaBff,
  signOutGoogleViaBff,
  tryRefreshGoogleAccessTokenViaBff,
} from '../../shared/session/labsGoogleSessionPort';
import { useLabsGoogleSessionRefresh } from '../../shared/session/useLabsGoogleSessionRefresh';
import {
  getEncoreLocationHash,
  getEncoreLocationHashServerSnapshot,
  parseGuestShareSnapshotFileIdFromHash,
  subscribeEncoreLocationHash,
} from '../seo/guestShareRobots';

/**
 * Auth surface for Encore: Google identity + Spotify connection state. Split out from
 * the legacy monolithic EncoreContext so consumers that only need session info (e.g.
 * EncoreAccountMenu, sign-in screens) do not re-render when library or sync state changes.
 */
export interface EncoreAuthContextValue {
  /**
   * False until the first Google session restore attempt finishes (avoids sign-in UI flash).
   * On the read-only guest share route (`#/share/…`), this becomes true immediately and GIS
   * bootstrap is skipped so anonymous visitors never load Google’s sign-in script.
   */
  googleAuthReady: boolean;
  googleAccessToken: string | null;
  /** True when the user skipped Google sign-in or disconnected Google but stayed in the app. */
  googleGateBypassed: boolean;
  /**
   * True when we have a remembered Google identity (email / displayName) but the access token is
   * stale or absent. The user can keep using local data; surface a "Sign in again" affordance
   * instead of bouncing them to the full sign-in gate. Per ADR 0010, Encore never silently
   * refreshes in the background — this flag is set on bootstrap (stale persisted session) or on
   * the local expiry-tick effect, and is cleared only by a user-initiated interactive sign-in or
   * by a `storage` event from a sibling tab that just signed in.
   */
  googleSessionExpired: boolean;
  /** Raw Google profile name (read-only; sourced from `userinfo`). */
  displayName: string | null;
  /** Google account email from `userinfo` (allowlist / Drive identity). */
  googleEmail: string | null;
  signInWithGoogle: () => Promise<void>;
  continueWithoutGoogle: () => void;
  signOut: () => void;
  spotifyLinked: boolean;
  disconnectSpotify: () => void;
  connectSpotify: () => Promise<void>;
  /**
   * Clears the stored Spotify session and starts OAuth again with Spotify’s approve screen
   * (`show_dialog`) so newly added scopes (e.g. playlist write) can be granted.
   */
  reauthorizeSpotify: () => Promise<void>;
  spotifyConnectError: string | null;
  spotifyConnectLoopbackUrl: string | null;
  clearSpotifyConnectError: () => void;
  accessDenied: boolean;
  accessDeniedMessage: string | null;
  retryAccessGate: () => void;
  /** True while an interactive Google token request is in flight (popup / consent UX). */
  googleSignInPending: boolean;
}

const EncoreAuthContext = createContext<EncoreAuthContextValue | null>(null);

const GOOGLE_SCOPES = [
  /** Covers Encore-created Drive files and Google Docs created/edited by Encore (per-file, not all Docs). */
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/youtube.readonly',
].join(' ');

const GOOGLE_GATE_BYPASS_STORAGE_KEY = 'encore_continue_without_google';

function readGoogleGateBypassed(): boolean {
  try {
    return window.localStorage.getItem(GOOGLE_GATE_BYPASS_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeGoogleGateBypassed(value: boolean): void {
  try {
    if (value) window.localStorage.setItem(GOOGLE_GATE_BYPASS_STORAGE_KEY, '1');
    else window.localStorage.removeItem(GOOGLE_GATE_BYPASS_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

function allowedHashes(): ReturnType<typeof parseAllowedEmailHashesFromEnv> {
  return parseAllowedEmailHashesFromEnv(import.meta.env.VITE_ALLOWED_EMAIL_HASHES as string | undefined);
}

function getGoogleClientId(): string {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  return id?.trim() ?? '';
}

/** True when bootstrap must await async BFF token refresh before the access gate can render truthfully. */
function needsAsyncGoogleSessionRestore(): boolean {
  if (typeof window === 'undefined') return false;
  if (!getGoogleClientId()) return false;
  const stored = readPersistedGoogleSession();
  const identity = readPersistedGoogleIdentity();
  if (stored && isPersistedSessionStillFresh(stored)) return false;
  if (identity?.email && isLabsGoogleSessionBffEnabled()) return true;
  return false;
}

function readInitialGoogleAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const stored = readPersistedGoogleSession();
  if (stored && isPersistedSessionStillFresh(stored)) return stored.accessToken;
  return null;
}

function readInitialGoogleGateBypassed(): boolean {
  if (typeof window === 'undefined') return false;
  if (readGoogleGateBypassed()) return true;
  if (!getGoogleClientId()) return true;
  const stored = readPersistedGoogleSession();
  const identity = readPersistedGoogleIdentity();
  if (
    stored &&
    !isPersistedSessionStillFresh(stored) &&
    identity?.email &&
    !isLabsGoogleSessionBffEnabled()
  ) {
    return true;
  }
  return false;
}

function readInitialGoogleSessionExpired(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = readPersistedGoogleSession();
  const identity = readPersistedGoogleIdentity();
  if (
    stored &&
    !isPersistedSessionStillFresh(stored) &&
    identity?.email &&
    !isLabsGoogleSessionBffEnabled()
  ) {
    return true;
  }
  return false;
}

function readInitialGoogleAuthReady(): boolean {
  if (typeof window === 'undefined') return false;
  if (parseGuestShareSnapshotFileIdFromHash() !== null) return true;
  if (needsAsyncGoogleSessionRestore()) return false;
  return true;
}

export function EncoreAuthProvider({ children }: { children: ReactNode }): ReactElement {
  const { clear: clearUndoStack } = useLabsUndo();
  const [googleAuthReady, setGoogleAuthReady] = useState(readInitialGoogleAuthReady);
  const locationHash = useSyncExternalStore(
    subscribeEncoreLocationHash,
    getEncoreLocationHash,
    getEncoreLocationHashServerSnapshot,
  );
  const guestShareRoute = parseGuestShareSnapshotFileIdFromHash(locationHash) !== null;
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(readInitialGoogleAccessToken);
  const [googleGateBypassed, setGoogleGateBypassed] = useState(readInitialGoogleGateBypassed);
  // Hydrate identity synchronously so the account menu / shell don't flash a "Not signed in"
  // state on first paint. Per ADR 0010 the bootstrap effect is now purely synchronous (no GIS
  // calls), but the initial render of the shell still needs the persisted identity before the
  // effect runs.
  const [displayName, setDisplayName] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return readPersistedGoogleIdentity()?.displayName?.trim() || null;
  });
  const [googleEmail, setGoogleEmail] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return readPersistedGoogleIdentity()?.email ?? null;
  });
  const [googleSessionExpired, setGoogleSessionExpired] = useState(readInitialGoogleSessionExpired);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  const [googleSignInPending, setGoogleSignInPending] = useState(false);
  const [spotifyLinked, setSpotifyLinked] = useState(() => hasUsableSpotifyTokenBundle());
  const [spotifyConnectError, setSpotifyConnectError] = useState<string | null>(null);
  const [spotifyConnectLoopbackUrl, setSpotifyConnectLoopbackUrl] = useState<string | null>(null);
  const [spotifyPrivacyOpen, setSpotifyPrivacyOpen] = useState(false);

  const googleAccessTokenRef = useRef<string | null>(null);
  googleAccessTokenRef.current = googleAccessToken;
  const googleSignInInFlightRef = useRef(false);
  /** Passed to Spotify authorize as `show_dialog` for reconnect flows. */
  const spotifyNextOAuthShowDialogRef = useRef(false);

  const refreshSpotifyLinked = useCallback(() => {
    setSpotifyLinked(hasUsableSpotifyTokenBundle());
  }, []);

  /**
   * Leaving the guest share route must clear “ready” before paint so the main shell shows the
   * spinner, not the sign-in gate, while Encore auth bootstraps. Initial load keeps the
   * synchronously-hydrated ready state so returning users do not flash the sign-in landing.
   */
  const wasGuestShareRouteRef = useRef(guestShareRoute);
  useLayoutEffect(() => {
    const wasGuest = wasGuestShareRouteRef.current;
    wasGuestShareRouteRef.current = guestShareRoute;
    if (wasGuest && !guestShareRoute) {
      setGoogleAuthReady(false);
    }
  }, [guestShareRoute]);

  useEffect(() => {
    refreshSpotifyLinked();
    const onSpotifySession = () => refreshSpotifyLinked();
    window.addEventListener(ENCORE_SPOTIFY_SESSION_EVENT, onSpotifySession);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'encore_spotify_token_json') refreshSpotifyLinked();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(ENCORE_SPOTIFY_SESSION_EVENT, onSpotifySession);
      window.removeEventListener('storage', onStorage);
    };
  }, [refreshSpotifyLinked]);

  const disconnectSpotify = useCallback(() => {
    clearSpotifyToken();
  }, []);

  const clearSpotifyConnectError = useCallback(() => {
    setSpotifyConnectError(null);
    setSpotifyConnectLoopbackUrl(null);
  }, []);

  const runSpotifyOAuthFlowInner = useCallback(async () => {
    setSpotifyConnectError(null);
    setSpotifyConnectLoopbackUrl(null);
    const clientId = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ?? '';
    if (!clientId) {
      setSpotifyConnectError('Spotify is not configured for this build (missing VITE_SPOTIFY_CLIENT_ID).');
      return;
    }
    const showDialog = spotifyNextOAuthShowDialogRef.current;
    spotifyNextOAuthShowDialogRef.current = false;
    const result = await startSpotifyOAuthFlow(clientId, { showDialog });
    if (!result.ok) {
      setSpotifyConnectError(result.message);
      setSpotifyConnectLoopbackUrl(result.openOnLoopbackUrl ?? null);
    }
  }, []);

  const connectSpotify = useCallback(async () => {
    setSpotifyConnectError(null);
    setSpotifyConnectLoopbackUrl(null);
    const clientId = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ?? '';
    if (!clientId) {
      setSpotifyConnectError('Spotify is not configured for this build (missing VITE_SPOTIFY_CLIENT_ID).');
      return;
    }
    spotifyNextOAuthShowDialogRef.current = false;
    if (!hasSpotifyPrivacyAck()) {
      setSpotifyPrivacyOpen(true);
      return;
    }
    await runSpotifyOAuthFlowInner();
  }, [runSpotifyOAuthFlowInner]);

  const reauthorizeSpotify = useCallback(async () => {
    setSpotifyConnectError(null);
    setSpotifyConnectLoopbackUrl(null);
    const clientId = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ?? '';
    if (!clientId) {
      setSpotifyConnectError('Spotify is not configured for this build (missing VITE_SPOTIFY_CLIENT_ID).');
      return;
    }
    clearSpotifyToken();
    spotifyNextOAuthShowDialogRef.current = true;
    if (!hasSpotifyPrivacyAck()) {
      setSpotifyPrivacyOpen(true);
      return;
    }
    await runSpotifyOAuthFlowInner();
  }, [runSpotifyOAuthFlowInner]);

  const confirmSpotifyPrivacyAndConnect = useCallback(() => {
    setSpotifyPrivacyAck();
    setSpotifyPrivacyOpen(false);
    void runSpotifyOAuthFlowInner();
  }, [runSpotifyOAuthFlowInner]);

  const finalizeGoogleSession = useCallback(
    async (
      accessToken: string,
      expiresIn: number | undefined,
      options: { persist: boolean; silent: boolean },
    ): Promise<boolean> => {
      const allowed = allowedHashes();
      try {
        const profile = await fetchGoogleUserProfile(accessToken);
        const email = profile.email;
        const hash = await sha256HexOfEmail(email);
        if (!isEmailHashAllowed(hash, allowed)) {
          clearPersistedGoogleSession();
          clearPersistedGoogleIdentity();
          setGoogleEmail(null);
          setDisplayName(null);
          if (!options.silent) {
            setAccessDenied(true);
            setAccessDeniedMessage(
              'This account is not on the allowlist for Encore. If you are the maintainer, add a SHA-256 hash of your normalized email to VITE_ALLOWED_EMAIL_HASHES.',
            );
          }
          return false;
        }
        if (options.persist) writePersistedGoogleSession(accessToken, expiresIn);
        const friendly = friendlyGoogleDisplayName(profile);
        // Persist identity separately from the access token so a future expiry doesn't blank
        // the account menu — the user keeps seeing who they were until they explicitly sign out.
        writePersistedGoogleIdentity({ email, displayName: friendly });
        setGoogleAccessToken(accessToken);
        setDisplayName(friendly);
        setGoogleEmail(email);
        setGoogleSessionExpired(false);
        setAccessDenied(false);
        setAccessDeniedMessage(null);
        writeGoogleGateBypassed(false);
        setGoogleGateBypassed(false);
        return true;
      } catch (e) {
        // Only nuke the persisted token + identity when Google itself rejected the credentials.
        // For network blips / 5xx / aborted requests we leave them in place so the user can
        // recover via "Sign in again" from the account menu instead of being demoted to the
        // full-screen sign-in gate. (Per ADR 0010 there is no background silent retry.)
        if (isLikelyGoogleAuthRejection(e)) {
          clearPersistedGoogleSession();
        }
        if (!options.silent) {
          setAccessDeniedMessage(e instanceof Error ? e.message : 'Could not verify Google account');
          setAccessDenied(true);
        }
        return false;
      }
    },
    [],
  );

  /**
   * Soft-bypass helper: when the persisted session has expired (or the in-app expiry tick fires),
   * leave the user in the app with their remembered identity and surface a "Sign in to sync"
   * affordance, instead of bouncing them to the full-screen sign-in gate. Per ADR 0010 this is
   * the ONLY way `googleSessionExpired` is set — Encore never silently refreshes in the
   * background, so the user always re-auths via an explicit click.
   */
  const enterSessionExpiredMode = useCallback(() => {
    // Token is no longer trustworthy — drop it so Drive calls fail fast instead of 401-looping.
    clearPersistedGoogleSession();
    setGoogleAccessToken(null);
    setGoogleSessionExpired(true);
    writeGoogleGateBypassed(true);
    setGoogleGateBypassed(true);
  }, []);

  /**
   * Bootstrap (synchronous, no GIS calls). Per ADR 0010:
   *   - Fresh persisted session  -> seed in-memory token from storage.
   *   - Stale session + identity -> enter expired mode (surface "Sign in to sync").
   *   - Stale session, no id     -> drop the token; user lands on the sign-in gate.
   *   - No session at all        -> nothing to do; user lands on the sign-in gate.
   *
   * The previous implementation called `requestGoogleSilentToken` (`prompt: 'none'`) up to three
   * times on every page load. Even though that's "popup-less", it loads a hidden GIS iframe
   * under accounts.google.com which strict browser cookie policies sometimes surface as a
   * stuck/ghost popup window. Returning users now see the sign-in landing if their token has
   * expired (one click to resume). That's the explicit trade-off documented in the ADR.
   */
  useEffect(() => {
    if (guestShareRoute) {
      setGoogleAuthReady(true);
      return;
    }
    let deferReady = false;
    try {
      const clientId = getGoogleClientId();
      if (!clientId) return;
      const stored = readPersistedGoogleSession();
      const rememberedIdentity = readPersistedGoogleIdentity();
      if (stored && isPersistedSessionStillFresh(stored)) {
        setGoogleAccessToken(stored.accessToken);
        if (rememberedIdentity?.email) {
          setGoogleEmail(rememberedIdentity.email);
          setDisplayName(rememberedIdentity.displayName?.trim() || null);
        }
        setGoogleSessionExpired(false);
        writeGoogleGateBypassed(false);
        setGoogleGateBypassed(false);
      } else if (rememberedIdentity?.email) {
        if (isLabsGoogleSessionBffEnabled()) {
          deferReady = true;
          void tryRefreshGoogleAccessTokenViaBff().then((token) => {
            if (token) {
              setGoogleAccessToken(token);
              setGoogleSessionExpired(false);
              writeGoogleGateBypassed(false);
              setGoogleGateBypassed(false);
            } else {
              enterSessionExpiredMode();
            }
            setGoogleAuthReady(true);
          });
        } else {
          enterSessionExpiredMode();
        }
      } else if (stored) {
        // Stale token, no remembered identity. Drop the token; user lands on the sign-in gate.
        clearPersistedGoogleSession();
      }
    } finally {
      if (!deferReady) {
        setGoogleAuthReady(true);
      }
    }
  }, [enterSessionExpiredMode, guestShareRoute]);

  /**
   * Local expiry-tick (no GIS calls). When the in-memory access token's persisted `expiresAtMs`
   * boundary arrives, flip the auth context into expired mode so the UI surfaces "Sign in to
   * sync" without waiting for the next Drive failure to bubble up. We schedule the tick a minute
   * ahead of the persisted expiry as a small visibility cushion.
   *
   * Critically, this effect performs NO calls into Google Identity Services — that's what the
   * deleted `armTimer` + `visibilitychange` listeners did, and they were the source of the
   * popup-spam complaint.
   */
  useEffect(() => {
    if (guestShareRoute) return;
    if (!googleAccessToken) return;
    const s = readPersistedGoogleSession();
    if (!s) return;
    const tickInMs = Math.max(0, s.expiresAtMs - 60_000 - Date.now());
    const handle = window.setTimeout(() => {
      void (async () => {
        if (isLabsGoogleSessionBffEnabled()) {
          const token = await tryRefreshGoogleAccessTokenViaBff();
          if (token) {
            setGoogleAccessToken(token);
            setGoogleSessionExpired(false);
            writeGoogleGateBypassed(false);
            setGoogleGateBypassed(false);
            return;
          }
        }
        enterSessionExpiredMode();
      })();
    }, tickInMs);
    return () => window.clearTimeout(handle);
  }, [googleAccessToken, enterSessionExpiredMode, guestShareRoute]);

  /**
   * Cross-tab sign-in propagation (popup-free). When tab A finishes interactive sign-in, the
   * persisted session lands in `localStorage`; tab B's native `storage` event fires (it never
   * fires on the writer tab) and tab B adopts the fresh token without showing its own popup.
   * Conversely, when tab A signs out, tab B drops its in-memory token to match.
   *
   * This is the one concession we make to "users don't have to click Sign in in every tab" —
   * worth keeping because it costs zero GIS activity.
   */
  useEffect(() => {
    if (guestShareRoute) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== ENCORE_GOOGLE_SESSION_STORAGE_KEY) return;
      const s = readPersistedGoogleSession();
      if (s && isPersistedSessionStillFresh(s)) {
        const id = readPersistedGoogleIdentity();
        setGoogleAccessToken(s.accessToken);
        if (id?.email) {
          setGoogleEmail(id.email);
          setDisplayName(id.displayName?.trim() || null);
        }
        setGoogleSessionExpired(false);
        writeGoogleGateBypassed(false);
        setGoogleGateBypassed(false);
      } else if (!s && googleAccessTokenRef.current) {
        setGoogleAccessToken(null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [guestShareRoute]);

  /**
   * Per ADR 0010: this is the ONLY path in Encore that may open a Google popup, and it always
   * opens one synchronously inside the user click handler (no silent prefetch first). The
   * previous implementation tried `prompt: 'none'` first and only fell through to interactive
   * after a ~12-second timeout, which meant some browsers dropped the user-gesture bit and the
   * popup got blocked — or the user gave up and clicked again, stacking ghost popups.
   *
   * `googleSignInInFlightRef` guards rapid double-clicks. There is no automatic retry on
   * failure: the user sees the error and clicks again when ready.
   */
  const signInWithGoogle = useCallback(async () => {
    const clientId = getGoogleClientId();
    if (!clientId) {
      setAccessDeniedMessage('Missing VITE_GOOGLE_CLIENT_ID.');
      setAccessDenied(true);
      return;
    }
    if (googleSignInInFlightRef.current) return;
    googleSignInInFlightRef.current = true;
    setGoogleSignInPending(true);
    setAccessDenied(false);
    setAccessDeniedMessage(null);
    try {
      const loginHint =
        googleEmail?.trim() ||
        readPersistedGoogleIdentity()?.email?.trim() ||
        undefined;
      if (isLabsGoogleSessionBffEnabled()) {
        try {
          const bffResponse = await signInWithGoogleViaBff();
          const ok = await finalizeGoogleSession(bffResponse.access_token, bffResponse.expires_in, {
            persist: true,
            silent: false,
          });
          if (!ok) return;
          persistLabsGoogleBffSession(bffResponse);
          setGoogleSessionExpired(false);
          return;
        } catch (e) {
          if (!isRecoverableBffSignInFailure(e)) throw e;
        }
      }
      const { access_token, expires_in } = await requestGoogleAccessToken(clientId, GOOGLE_SCOPES, {
        ...(loginHint ? { loginHint } : {}),
      });
      const ok = await finalizeGoogleSession(access_token, expires_in, { persist: true, silent: false });
      if (!ok) return;
      setGoogleSessionExpired(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setAccessDeniedMessage(msg);
      setAccessDenied(true);
    } finally {
      googleSignInInFlightRef.current = false;
      setGoogleSignInPending(false);
    }
  }, [finalizeGoogleSession, googleEmail]);

  const continueWithoutGoogle = useCallback(() => {
    writeGoogleGateBypassed(true);
    setGoogleGateBypassed(true);
  }, []);

  const signOut = useCallback(() => {
    const token = googleAccessToken;
    setGoogleAccessToken(null);
    setDisplayName(null);
    setGoogleEmail(null);
    setGoogleSessionExpired(false);
    clearUndoStack();
    clearPersistedGoogleSession();
    clearPersistedGoogleIdentity();
    if (token) revokeGoogleAccessTokenBestEffort(token);
    if (isLabsGoogleSessionBffEnabled()) void signOutGoogleViaBff();
    writeGoogleGateBypassed(true);
    setGoogleGateBypassed(true);
  }, [clearUndoStack, googleAccessToken]);

  useLabsGoogleSessionRefresh((accessToken) => {
    setGoogleAccessToken(accessToken);
    setGoogleSessionExpired(false);
    writeGoogleGateBypassed(false);
    setGoogleGateBypassed(false);
  });

  const retryAccessGate = useCallback(() => {
    setAccessDenied(false);
    setAccessDeniedMessage(null);
  }, []);

  const value = useMemo<EncoreAuthContextValue>(
    () => ({
      googleAuthReady,
      googleAccessToken,
      googleGateBypassed,
      googleSessionExpired,
      displayName,
      googleEmail,
      signInWithGoogle,
      continueWithoutGoogle,
      signOut,
      spotifyLinked,
      disconnectSpotify,
      connectSpotify,
      reauthorizeSpotify,
      spotifyConnectError,
      spotifyConnectLoopbackUrl,
      clearSpotifyConnectError,
      accessDenied,
      accessDeniedMessage,
      retryAccessGate,
      googleSignInPending,
    }),
    [
      googleAuthReady,
      googleAccessToken,
      googleGateBypassed,
      googleSessionExpired,
      displayName,
      googleEmail,
      signInWithGoogle,
      googleSignInPending,
      continueWithoutGoogle,
      signOut,
      spotifyLinked,
      disconnectSpotify,
      connectSpotify,
      reauthorizeSpotify,
      spotifyConnectError,
      spotifyConnectLoopbackUrl,
      clearSpotifyConnectError,
      accessDenied,
      accessDeniedMessage,
      retryAccessGate,
    ],
  );

  return (
    <EncoreAuthContext.Provider value={value}>
      {children}
      <SpotifyPrivacyAckDialog
        open={spotifyPrivacyOpen}
        onClose={() => setSpotifyPrivacyOpen(false)}
        onConfirm={confirmSpotifyPrivacyAndConnect}
      />
    </EncoreAuthContext.Provider>
  );
}

export function useEncoreAuth(): EncoreAuthContextValue {
  const ctx = useContext(EncoreAuthContext);
  if (!ctx) throw new Error('useEncoreAuth outside EncoreAuthProvider');
  return ctx;
}
