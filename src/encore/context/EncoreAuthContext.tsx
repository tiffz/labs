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
  clearPersistedGoogleSession,
  isPersistedSessionStillFresh,
  readPersistedGoogleSession,
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
  /** Raw Google profile name (read-only; sourced from `userinfo`). */
  displayName: string | null;
  signInWithGoogle: () => Promise<void>;
  continueWithoutGoogle: () => void;
  signOut: () => void;
  spotifyLinked: boolean;
  disconnectSpotify: () => void;
  connectSpotify: () => Promise<void>;
  spotifyConnectError: string | null;
  spotifyConnectLoopbackUrl: string | null;
  clearSpotifyConnectError: () => void;
  accessDenied: boolean;
  accessDeniedMessage: string | null;
  retryAccessGate: () => void;
}

const EncoreAuthContext = createContext<EncoreAuthContextValue | null>(null);

const GOOGLE_SCOPES = [
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
    return await promiseWithTimeout(
      requestGoogleAccessToken(clientId, scope, { prompt: 'none' }),
      12_000,
      'Google silent refresh',
    );
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
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  const [spotifyLinked, setSpotifyLinked] = useState(() => hasUsableSpotifyTokenBundle());
  const [spotifyConnectError, setSpotifyConnectError] = useState<string | null>(null);
  const [spotifyConnectLoopbackUrl, setSpotifyConnectLoopbackUrl] = useState<string | null>(null);
  const [spotifyPrivacyOpen, setSpotifyPrivacyOpen] = useState(false);

  const googleAccessTokenRef = useRef<string | null>(null);
  googleAccessTokenRef.current = googleAccessToken;

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
    const result = await startSpotifyOAuthFlow(clientId);
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
          if (!options.silent) {
            setAccessDenied(true);
            setAccessDeniedMessage(
              'This account is not on the allowlist for Encore. If you are the maintainer, add a SHA-256 hash of your normalized email to VITE_ALLOWED_EMAIL_HASHES.',
            );
          }
          return false;
        }
        if (options.persist) writePersistedGoogleSession(accessToken, expiresIn);
        setGoogleAccessToken(accessToken);
        setDisplayName(friendlyGoogleDisplayName(profile));
        setAccessDenied(false);
        setAccessDeniedMessage(null);
        writeGoogleGateBypassed(false);
        setGoogleGateBypassed(false);
        return true;
      } catch (e) {
        clearPersistedGoogleSession();
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
            /* fall through: token may be revoked — try silent refresh before clearing */
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
            clearPersistedGoogleSession();
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
            /* clear */
          }
          if (!cancelled) clearPersistedGoogleSession();
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
    if (!googleAccessToken) return;
    const clientId = getGoogleClientId();
    if (!clientId) return;

    let timeoutId: number | undefined;

    const armTimer = () => {
      if (timeoutId != null) window.clearTimeout(timeoutId);
      const s = readPersistedGoogleSession();
      if (!s) return;
      const wakeAt = s.expiresAtMs - 3 * 60 * 1000;
      const delay = Math.max(25_000, Math.min(wakeAt - Date.now(), 55 * 60 * 1000));
      timeoutId = window.setTimeout(() => {
        void (async () => {
          const next = await requestGoogleSilentToken(clientId, GOOGLE_SCOPES);
          if (next) {
            const ok = await finalizeGoogleSession(next.access_token, next.expires_in, {
              persist: true,
              silent: true,
            });
            if (ok) armTimer();
          }
        })();
      }, delay);
    };

    armTimer();

    let visibilityDebounceId: number | undefined;

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const s = readPersistedGoogleSession();
      // Avoid a silent GIS exchange on every tab focus when the token is still healthy.
      if (!s || s.expiresAtMs > Date.now() + 4 * 60 * 1000) return;
      if (visibilityDebounceId != null) window.clearTimeout(visibilityDebounceId);
      visibilityDebounceId = window.setTimeout(() => {
        visibilityDebounceId = undefined;
        void (async () => {
          const next = await requestGoogleSilentToken(clientId, GOOGLE_SCOPES);
          if (next) {
            await finalizeGoogleSession(next.access_token, next.expires_in, {
              persist: true,
              silent: true,
            });
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
  }, [googleAccessToken, finalizeGoogleSession]);

  const signInWithGoogle = useCallback(async () => {
    const clientId = getGoogleClientId();
    if (!clientId) {
      setAccessDeniedMessage('Missing VITE_GOOGLE_CLIENT_ID.');
      setAccessDenied(true);
      return;
    }
    setAccessDenied(false);
    setAccessDeniedMessage(null);
    try {
      const { access_token, expires_in } = await requestGoogleAccessToken(clientId, GOOGLE_SCOPES);
      const ok = await finalizeGoogleSession(access_token, expires_in, { persist: true, silent: false });
      if (!ok) return;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setAccessDeniedMessage(msg);
      setAccessDenied(true);
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
    clearUndoStack();
    clearPersistedGoogleSession();
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
      displayName,
      signInWithGoogle,
      continueWithoutGoogle,
      signOut,
      spotifyLinked,
      disconnectSpotify,
      connectSpotify,
      spotifyConnectError,
      spotifyConnectLoopbackUrl,
      clearSpotifyConnectError,
      accessDenied,
      accessDeniedMessage,
      retryAccessGate,
    }),
    [
      googleAuthReady,
      googleAccessToken,
      googleGateBypassed,
      displayName,
      signInWithGoogle,
      continueWithoutGoogle,
      signOut,
      spotifyLinked,
      disconnectSpotify,
      connectSpotify,
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
