/* EncoreProvider + useEncore hook share module state; Fast Refresh split not worth it here. */
/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { encoreDb, getSyncMeta, type RepertoireExtrasRow } from '../db/encoreDb';
import type { EncorePerformance, EncoreSong } from '../types';
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
import { defaultRepertoireExtrasRow } from '../drive/repertoireWire';
import {
  runInitialSyncIfPossible,
  pushRepertoireToDrive,
  resolveConflictUseRemoteThenPush,
  resolveConflictKeepLocal,
} from '../drive/repertoireSync';
import {
  ENCORE_SPOTIFY_SESSION_EVENT,
  clearSpotifyToken,
  hasUsableSpotifyTokenBundle,
} from '../spotify/pkce';
import type { SyncCheckResult } from '../drive/repertoireSync';
import { publishSnapshotToDrive } from '../drive/publicSnapshot';
import { SpotifyPrivacyAckDialog } from '../components/SpotifyPrivacyAckDialog';
import { hasSpotifyPrivacyAck, setSpotifyPrivacyAck } from '../spotify/spotifyPrivacyAck';
import { startSpotifyOAuthFlow } from '../spotify/startSpotifyOAuthFlow';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  // Pasted-folder bulk import + subfolder walk (names only; see drive.metadata.readonly).
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/youtube.readonly',
].join(' ');

/** User chose local-only mode (no Google session); persisted so reloads stay in the app. */
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

export type SyncUiState = 'idle' | 'syncing' | 'error' | 'conflict';

interface EncoreContextValue {
  /** False until the first Google session restore attempt finishes (avoids sign-in UI flash). */
  googleAuthReady: boolean;
  googleAccessToken: string | null;
  /** True when the user skipped Google sign-in or disconnected Google but stayed in the app (local library only). */
  googleGateBypassed: boolean;
  displayName: string | null;
  signInWithGoogle: () => Promise<void>;
  /** Use Encore with the local library only (no Drive sync or YouTube import until you sign in to Google). */
  continueWithoutGoogle: () => void;
  /** Disconnect Google (Drive sync, YouTube import). Local library remains; Spotify stays linked unless you disconnect it. */
  signOut: () => void;
  /** Spotify metadata / playlist import only. */
  spotifyLinked: boolean;
  disconnectSpotify: () => void;
  /** Starts Spotify OAuth (full-page redirect). Sets `spotifyConnectError` if blocked or misconfigured. */
  connectSpotify: () => Promise<void>;
  spotifyConnectError: string | null;
  /** When set with `spotifyConnectError`, same-tab link to open Encore on 127.0.0.1 (Spotify localhost block). */
  spotifyConnectLoopbackUrl: string | null;
  clearSpotifyConnectError: () => void;
  accessDenied: boolean;
  accessDeniedMessage: string | null;
  retryAccessGate: () => void;
  songs: EncoreSong[];
  performances: EncorePerformance[];
  /** Venue catalog + global milestone template (synced in `repertoire_data.json`). */
  repertoireExtras: RepertoireExtrasRow;
  /** True after the first local Dexie library read finishes (avoids treating an empty in-memory list as definitive). */
  libraryReady: boolean;
  refreshLibrary: () => Promise<void>;
  saveRepertoireExtras: (patch: Partial<Omit<RepertoireExtrasRow, 'id'>>) => Promise<void>;
  saveSong: (song: EncoreSong) => Promise<void>;
  deleteSong: (id: string) => Promise<void>;
  savePerformance: (p: EncorePerformance) => Promise<void>;
  deletePerformance: (id: string) => Promise<void>;
  syncState: SyncUiState;
  syncMessage: string | null;
  scheduleBackgroundSync: () => void;
  conflict: SyncCheckResult | null;
  resolveConflictRemote: () => Promise<void>;
  resolveConflictLocal: () => Promise<void>;
  dismissConflict: () => void;
  publishPublicSnapshot: () => Promise<{ fileId: string }>;
}

const EncoreContext = createContext<EncoreContextValue | null>(null);

function getGoogleClientId(): string {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  return id?.trim() ?? '';
}

/**
 * Ask Google for a new access token without showing the account picker, when the user
 * has already granted Encore’s scopes in this browser. Fails (null) if consent is needed again.
 */
async function requestGoogleSilentToken(clientId: string, scope: string): Promise<{ access_token: string; expires_in?: number } | null> {
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

export function EncoreProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [googleAuthReady, setGoogleAuthReady] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleGateBypassed, setGoogleGateBypassed] = useState(() =>
    typeof window !== 'undefined' ? readGoogleGateBypassed() : false,
  );
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  const [songs, setSongs] = useState<EncoreSong[]>([]);
  const [performances, setPerformances] = useState<EncorePerformance[]>([]);
  const [repertoireExtras, setRepertoireExtras] = useState<RepertoireExtrasRow>(() =>
    defaultRepertoireExtrasRow(new Date().toISOString()),
  );
  const [libraryReady, setLibraryReady] = useState(false);
  const [syncState, setSyncState] = useState<SyncUiState>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState<SyncCheckResult | null>(null);
  const [spotifyLinked, setSpotifyLinked] = useState(() => hasUsableSpotifyTokenBundle());
  const [spotifyConnectError, setSpotifyConnectError] = useState<string | null>(null);
  const [spotifyConnectLoopbackUrl, setSpotifyConnectLoopbackUrl] = useState<string | null>(null);
  const [spotifyPrivacyOpen, setSpotifyPrivacyOpen] = useState(false);

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

  const refreshLibrary = useCallback(async () => {
    const [s, p, x] = await Promise.all([
      encoreDb.songs.orderBy('title').toArray(),
      encoreDb.performances.toArray(),
      encoreDb.repertoireExtras.get('default'),
    ]);
    setSongs(s);
    setPerformances(p);
    const now = new Date().toISOString();
    let extras = x;
    if (!extras) {
      const fromPerf = [...new Set(p.map((r) => r.venueTag.trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' }),
      );
      extras = { id: 'default', venueCatalog: fromPerf, milestoneTemplate: [], updatedAt: now };
      await encoreDb.repertoireExtras.put(extras);
    }
    setRepertoireExtras(extras);
    setLibraryReady(true);
  }, []);

  useEffect(() => {
    void refreshLibrary();
  }, [refreshLibrary]);

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
        if (stored) {
          if (isPersistedSessionStillFresh(stored)) {
            try {
              const ok = await promiseWithTimeout(
                finalizeGoogleSession(stored.accessToken, undefined, { persist: false, silent: true }),
                15_000,
                'Restoring Google session',
              );
              if (cancelled) return;
              if (ok) return;
            } catch {
              if (!cancelled) clearPersistedGoogleSession();
            }
          }

          if (cancelled) return;
          const renewed = await requestGoogleSilentToken(clientId, GOOGLE_SCOPES);
          if (!cancelled && renewed) {
            const ok = await finalizeGoogleSession(renewed.access_token, renewed.expires_in, {
              persist: true,
              silent: true,
            });
            if (ok) return;
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

  /** Proactively renew the short-lived GIS access token before local expiry (and when returning to the tab). */
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
            const ok = await finalizeGoogleSession(next.access_token, next.expires_in, { persist: true, silent: true });
            if (ok) armTimer();
          }
        })();
      }, delay);
    };

    armTimer();

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const s = readPersistedGoogleSession();
      if (!s || s.expiresAtMs > Date.now() + 120_000) return;
      void (async () => {
        const next = await requestGoogleSilentToken(clientId, GOOGLE_SCOPES);
        if (next) {
          await finalizeGoogleSession(next.access_token, next.expires_in, { persist: true, silent: true });
        }
      })();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (timeoutId != null) window.clearTimeout(timeoutId);
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
    setConflict(null);
    clearPersistedGoogleSession();
    if (token) revokeGoogleAccessTokenBestEffort(token);
    writeGoogleGateBypassed(true);
    setGoogleGateBypassed(true);
  }, [googleAccessToken]);

  const retryAccessGate = useCallback(() => {
    setAccessDenied(false);
    setAccessDeniedMessage(null);
  }, []);

  const runSync = useCallback(async () => {
    if (!googleAccessToken) return;
    setSyncState('syncing');
    setSyncMessage(null);
    const result = await runInitialSyncIfPossible(googleAccessToken);
    if (!result.ok && result.conflict?.conflict) {
      setSyncState('conflict');
      setConflict(result.conflict);
      await refreshLibrary();
      return;
    }
    if (!result.ok && result.error) {
      setSyncState('error');
      setSyncMessage(result.error);
      await refreshLibrary();
      return;
    }
    setSyncState('idle');
    setConflict(null);
    await refreshLibrary();
  }, [googleAccessToken, refreshLibrary]);

  const lastAutoSyncTokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (!googleAccessToken) {
      lastAutoSyncTokenRef.current = null;
      return;
    }
    if (lastAutoSyncTokenRef.current === googleAccessToken) return;
    lastAutoSyncTokenRef.current = googleAccessToken;
    void runSync();
  }, [googleAccessToken, runSync]);

  const scheduleBackgroundSync = useCallback(() => {
    if (!googleAccessToken) return;
    void (async () => {
      try {
        const meta = await getSyncMeta();
        if (!meta.repertoireFileId) return;
        await pushRepertoireToDrive(googleAccessToken, meta.repertoireFileId, meta.lastRemoteEtag);
        setSyncState('idle');
        setSyncMessage(null);
      } catch (e) {
        setSyncState('error');
        setSyncMessage(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [googleAccessToken]);

  const saveRepertoireExtras = useCallback(
    async (patch: Partial<Omit<RepertoireExtrasRow, 'id'>>) => {
      const now = new Date().toISOString();
      const cur = (await encoreDb.repertoireExtras.get('default')) ?? defaultRepertoireExtrasRow(now);
      const next: RepertoireExtrasRow = { ...cur, ...patch, id: 'default', updatedAt: now };
      await encoreDb.repertoireExtras.put(next);
      setRepertoireExtras(next);
      scheduleBackgroundSync();
    },
    [scheduleBackgroundSync],
  );

  const saveSong = useCallback(
    async (song: EncoreSong) => {
      await encoreDb.songs.put(song);
      await refreshLibrary();
      scheduleBackgroundSync();
    },
    [refreshLibrary, scheduleBackgroundSync]
  );

  const deleteSong = useCallback(
    async (id: string) => {
      await encoreDb.songs.delete(id);
      await encoreDb.performances.where('songId').equals(id).delete();
      await refreshLibrary();
      scheduleBackgroundSync();
    },
    [refreshLibrary, scheduleBackgroundSync]
  );

  const savePerformance = useCallback(
    async (p: EncorePerformance) => {
      await encoreDb.performances.put(p);
      await refreshLibrary();
      scheduleBackgroundSync();
    },
    [refreshLibrary, scheduleBackgroundSync]
  );

  const deletePerformance = useCallback(
    async (id: string) => {
      await encoreDb.performances.delete(id);
      await refreshLibrary();
      scheduleBackgroundSync();
    },
    [refreshLibrary, scheduleBackgroundSync]
  );

  const resolveConflictRemote = useCallback(async () => {
    if (!googleAccessToken) return;
    setSyncState('syncing');
    try {
      await resolveConflictUseRemoteThenPush(googleAccessToken);
      setConflict(null);
      setSyncState('idle');
      await refreshLibrary();
    } catch (e) {
      setSyncState('error');
      setSyncMessage(e instanceof Error ? e.message : String(e));
    }
  }, [googleAccessToken, refreshLibrary]);

  const resolveConflictLocal = useCallback(async () => {
    if (!googleAccessToken) return;
    setSyncState('syncing');
    try {
      await resolveConflictKeepLocal(googleAccessToken);
      setConflict(null);
      setSyncState('idle');
      await refreshLibrary();
    } catch (e) {
      setSyncState('error');
      setSyncMessage(e instanceof Error ? e.message : String(e));
    }
  }, [googleAccessToken, refreshLibrary]);

  const dismissConflict = useCallback(() => {
    setConflict(null);
    setSyncState('idle');
  }, []);

  const publishPublicSnapshot = useCallback(async () => {
    if (!googleAccessToken) throw new Error('Not signed in');
    return publishSnapshotToDrive(googleAccessToken);
  }, [googleAccessToken]);

  const value = useMemo<EncoreContextValue>(
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
      songs,
      performances,
      repertoireExtras,
      libraryReady,
      refreshLibrary,
      saveRepertoireExtras,
      saveSong,
      deleteSong,
      savePerformance,
      deletePerformance,
      syncState,
      syncMessage,
      scheduleBackgroundSync,
      conflict,
      resolveConflictRemote,
      resolveConflictLocal,
      dismissConflict,
      publishPublicSnapshot,
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
      songs,
      performances,
      repertoireExtras,
      libraryReady,
      refreshLibrary,
      saveRepertoireExtras,
      saveSong,
      deleteSong,
      savePerformance,
      deletePerformance,
      syncState,
      syncMessage,
      scheduleBackgroundSync,
      conflict,
      resolveConflictRemote,
      resolveConflictLocal,
      dismissConflict,
      publishPublicSnapshot,
    ]
  );

  return (
    <>
      <EncoreContext.Provider value={value}>{children}</EncoreContext.Provider>
      <SpotifyPrivacyAckDialog
        open={spotifyPrivacyOpen}
        onClose={() => setSpotifyPrivacyOpen(false)}
        onConfirm={confirmSpotifyPrivacyAndConnect}
      />
    </>
  );
}

export function useEncore(): EncoreContextValue {
  const ctx = useContext(EncoreContext);
  if (!ctx) throw new Error('useEncore outside EncoreProvider');
  return ctx;
}
