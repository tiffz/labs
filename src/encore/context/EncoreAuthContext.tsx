/* Provider + hook share module state; Fast Refresh split not worth the import churn. */
/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { fetchGoogleUserProfile, friendlyGoogleDisplayName } from '../auth/loadGisScript';
import {
  clearPersistedGoogleIdentity,
  clearPersistedGoogleSession,
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
import { promiseWithTimeout } from '../auth/promiseWithTimeout';
import {
  ENCORE_SPOTIFY_SESSION_EVENT,
  clearSpotifyToken,
  hasUsableSpotifyTokenBundle,
} from '../spotify/pkce';
import { SpotifyPrivacyAckDialog } from '../components/SpotifyPrivacyAckDialog';
import { hasSpotifyPrivacyAck, setSpotifyPrivacyAck } from '../spotify/spotifyPrivacyAck';
import { startSpotifyOAuthFlow } from '../spotify/startSpotifyOAuthFlow';
import { useLabsUndo } from '../../shared/undo/LabsUndoContext';

/**
 * Auth surface for Encore: Google identity + Spotify connection state. Split out from
 * the legacy monolithic EncoreContext so consumers that only need session info (e.g.
 * EncoreAccountMenu, sign-in screens) do not re-render when library or sync state changes.
 */
export interface EncoreAuthContextValue {
  /** False until the first Google session restore attempt finishes (avoids sign-in UI flash). */
  googleAuthReady: boolean;
  googleAccessToken: string | null;
  /** True when the user skipped Google sign-in or disconnected Google but stayed in the app. */
  googleGateBypassed: boolean;
  /**
   * True when we have a remembered Google identity (email / displayName) but the access token has
   * expired and silent refresh failed. The user can keep using local data; surface a "Sign in
   * again" affordance instead of bouncing to the full sign-in gate so we don't ping-pong them
   * every hour. Cleared as soon as a token request succeeds.
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

async function requestGoogleSilentToken(
  clientId: string,
  scope: string,
): Promise<{ access_token: string; expires_in?: number } | null> {
  try {
    return await requestGoogleAccessToken(clientId, scope, { prompt: 'none' });
  } catch {
    return null;
  }
}

export function EncoreAuthProvider({ children }: { children: ReactNode }): ReactElement {
  const { clear: clearUndoStack } = useLabsUndo();
  const [googleAuthReady, setGoogleAuthReady] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleGateBypassed, setGoogleGateBypassed] = useState(() =>
    typeof window !== 'undefined' ? readGoogleGateBypassed() : false,
  );
  // Hydrate identity synchronously so the account menu / shell don't flash a "Not signed in" state
  // while the bootstrap effect is still working through the silent-refresh paths.
  const [displayName, setDisplayName] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return readPersistedGoogleIdentity()?.displayName?.trim() || null;
  });
  const [googleEmail, setGoogleEmail] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return readPersistedGoogleIdentity()?.email ?? null;
  });
  const [googleSessionExpired, setGoogleSessionExpired] = useState(false);
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
        // recover (silent refresh, or "Sign in again" from the account menu) instead of being
        // demoted to the full-screen sign-in gate.
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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const clientId = getGoogleClientId();
        if (!clientId) return;
        const stored = readPersistedGoogleSession();
        const rememberedIdentity = readPersistedGoogleIdentity();

        // Soft-bypass helper: when we *had* a session and silent restore can't recover one, leave
        // the user in the app with their remembered identity and surface a "Session expired"
        // affordance, instead of bouncing them to the full-screen sign-in gate.
        const enterSessionExpiredMode = () => {
          if (cancelled) return;
          // Token is no longer trustworthy — drop it so Drive calls fail fast instead of 401-looping.
          clearPersistedGoogleSession();
          setGoogleAccessToken(null);
          setGoogleSessionExpired(true);
          writeGoogleGateBypassed(true);
          setGoogleGateBypassed(true);
        };

        if (stored && isPersistedSessionStillFresh(stored)) {
          try {
            const ok = await promiseWithTimeout(
              finalizeGoogleSession(stored.accessToken, undefined, { persist: false, silent: true }),
              15_000,
              'Restoring Google session',
            );
            if (cancelled) return;
            if (ok) return;
          } catch {
            /* fall through: token may be revoked — try silent refresh before degrading */
          }
          if (!cancelled) {
            const next = await requestGoogleSilentToken(clientId, GOOGLE_SCOPES);
            if (next && !cancelled) {
              const okSilent = await finalizeGoogleSession(next.access_token, next.expires_in, {
                persist: true,
                silent: true,
              });
              if (okSilent) return;
            }
            if (rememberedIdentity) {
              enterSessionExpiredMode();
            } else {
              clearPersistedGoogleSession();
            }
          }
        } else if (stored) {
          // Local expiry heuristic passed, but Google may still grant a token via cookie (`prompt: none`).
          const next = await requestGoogleSilentToken(clientId, GOOGLE_SCOPES);
          if (cancelled) return;
          if (next) {
            const okSilent = await finalizeGoogleSession(next.access_token, next.expires_in, {
              persist: true,
              silent: true,
            });
            if (okSilent) return;
          }
          try {
            const okLegacy = await promiseWithTimeout(
              finalizeGoogleSession(stored.accessToken, undefined, { persist: true, silent: true }),
              15_000,
              'Restoring Google session',
            );
            if (!cancelled && okLegacy) return;
          } catch {
            /* fall through to expired mode below */
          }
          if (rememberedIdentity) {
            enterSessionExpiredMode();
          } else if (!cancelled) {
            clearPersistedGoogleSession();
          }
        } else if (rememberedIdentity) {
          // No stored token (cleared by a previous failure) but we still remember who they are.
          // Try a silent refresh; if it fails, surface the "Session expired" affordance instead
          // of dropping them at the sign-in gate.
          const next = await requestGoogleSilentToken(clientId, GOOGLE_SCOPES);
          if (cancelled) return;
          if (next) {
            const okSilent = await finalizeGoogleSession(next.access_token, next.expires_in, {
              persist: true,
              silent: true,
            });
            if (okSilent) return;
          }
          enterSessionExpiredMode();
        }
      } finally {
        if (!cancelled) setGoogleAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [finalizeGoogleSession]);

  useEffect(() => {
    // We want the refresh loop active whenever there's *any* hope of recovering a session — either
    // a live access token, or a remembered identity sitting in expired mode (where a successful
    // silent refresh quietly restores Drive without a UI bounce).
    if (!googleAccessToken && !googleSessionExpired) return;
    const clientId = getGoogleClientId();
    if (!clientId) return;

    let timeoutId: number | undefined;
    /**
     * Backoff for *failed* silent refreshes (browser blocking 3rd-party cookies, GIS hiccups, etc.).
     * Without this, a single failure used to wedge the loop until the next tab focus — long enough
     * that the user perceived "I have to sign in again every time I open Encore".
     */
    const FAILURE_BACKOFFS_MS = [5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000];
    let consecutiveFailures = 0;

    const armTimer = () => {
      if (timeoutId != null) window.clearTimeout(timeoutId);
      const s = readPersistedGoogleSession();
      let delay: number;
      if (s) {
        const wakeAt = s.expiresAtMs - 3 * 60 * 1000;
        delay = Math.max(25_000, Math.min(wakeAt - Date.now(), 55 * 60 * 1000));
      } else {
        // Expired mode: keep poking GIS in case the user signs into Google in another tab.
        const idx = Math.min(consecutiveFailures, FAILURE_BACKOFFS_MS.length - 1);
        delay = FAILURE_BACKOFFS_MS[idx]!;
      }
      timeoutId = window.setTimeout(() => {
        void (async () => {
          const next = await requestGoogleSilentToken(clientId, GOOGLE_SCOPES);
          if (next) {
            const ok = await finalizeGoogleSession(next.access_token, next.expires_in, {
              persist: true,
              silent: true,
            });
            if (ok) {
              consecutiveFailures = 0;
              armTimer();
              return;
            }
          }
          consecutiveFailures += 1;
          const idx = Math.min(consecutiveFailures - 1, FAILURE_BACKOFFS_MS.length - 1);
          if (timeoutId != null) window.clearTimeout(timeoutId);
          timeoutId = window.setTimeout(armTimer, FAILURE_BACKOFFS_MS[idx]!);
        })();
      }, delay);
    };

    armTimer();

    let visibilityDebounceId: number | undefined;

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const s = readPersistedGoogleSession();
      // Skip when the token is still comfortably healthy — no need to re-handshake on every focus.
      // But always retry on focus when we're in expired mode: tab focus is the user's most
      // likely "I just signed back into Google in another tab" moment.
      if (s && s.expiresAtMs > Date.now() + 4 * 60 * 1000) return;
      if (visibilityDebounceId != null) window.clearTimeout(visibilityDebounceId);
      visibilityDebounceId = window.setTimeout(() => {
        visibilityDebounceId = undefined;
        void (async () => {
          const next = await requestGoogleSilentToken(clientId, GOOGLE_SCOPES);
          if (next) {
            const ok = await finalizeGoogleSession(next.access_token, next.expires_in, {
              persist: true,
              silent: true,
            });
            if (ok) {
              consecutiveFailures = 0;
              armTimer();
            }
          }
        })();
      }, 450);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (timeoutId != null) window.clearTimeout(timeoutId);
      if (visibilityDebounceId != null) window.clearTimeout(visibilityDebounceId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [googleAccessToken, googleSessionExpired, finalizeGoogleSession]);

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
      const { access_token, expires_in } = await requestGoogleAccessToken(clientId, GOOGLE_SCOPES);
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
  }, [finalizeGoogleSession]);

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
    writeGoogleGateBypassed(true);
    setGoogleGateBypassed(true);
  }, [clearUndoStack, googleAccessToken]);

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
