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
import { syncSongLegacyMediaIds } from '../repertoire/songMediaLinks';
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
import { publishSnapshotToDrive, type BuildPublicSnapshotOptions } from '../drive/publicSnapshot';
import { reorganizeAllDriveUploads, type ReorganizeDriveUploadsResult } from '../drive/driveReorganize';
import { syncPerformanceVideo, syncPerformanceVideoFileName } from '../drive/performanceShortcut';
import { SpotifyPrivacyAckDialog } from '../components/SpotifyPrivacyAckDialog';
import { hasSpotifyPrivacyAck, setSpotifyPrivacyAck } from '../spotify/spotifyPrivacyAck';
import { startSpotifyOAuthFlow } from '../spotify/startSpotifyOAuthFlow';
import { LabsUndoProvider, useLabsUndo } from '../../shared/undo/LabsUndoContext';
import { installServerLogger } from '../../shared/utils/serverLogger';
import { EncoreBlockingJobProvider, useEncoreBlockingJobs } from './EncoreBlockingJobContext';

const serverLogger = installServerLogger('ENCORE');

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
  /** Raw Google profile name (read-only; sourced from `userinfo`). */
  displayName: string | null;
  /** Owner display name shown in app + share view: user override (synced) wins; falls back to Google profile. */
  effectiveDisplayName: string | null;
  /** Persist a user-edited display name; pass empty string to clear back to Google profile name. */
  setOwnerDisplayName: (name: string) => Promise<void>;
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
  /**
   * Persist a song.
   *
   * Pass `silentUndo: true` for autosave-driven writes that should not push a
   * per-tick undo entry (e.g. SongPage debounced autosave). When silent, the
   * caller is responsible for pushing a single combined undo at the explicit
   * commit boundary (e.g. on navigate-away).
   */
  saveSong: (song: EncoreSong, options?: { silentUndo?: boolean }) => Promise<void>;
  deleteSong: (id: string) => Promise<void>;
  savePerformance: (p: EncorePerformance, options?: { silentUndo?: boolean }) => Promise<void>;
  deletePerformance: (id: string) => Promise<void>;
  syncState: SyncUiState;
  syncMessage: string | null;
  scheduleBackgroundSync: () => void;
  conflict: SyncCheckResult | null;
  resolveConflictRemote: () => Promise<void>;
  resolveConflictLocal: () => Promise<void>;
  dismissConflict: () => void;
  publishPublicSnapshot: (options?: BuildPublicSnapshotOptions) => Promise<{
    fileId: string;
    generatedAt: string;
    driveModifiedTime?: string;
    publiclyReadable: boolean;
    warning?: string;
    publicVideoCount: number;
    privateVideoCount: number;
  }>;
  /** Re-name / move Encore-managed Drive uploads: performance videos and song attachments (charts, etc.). */
  reorganizeDriveUploads: () => Promise<ReorganizeDriveUploadsResult>;
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

function cloneEncoreUndoSnapshot<T>(value: T): T {
  return structuredClone(value);
}

export function EncoreProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <LabsUndoProvider>
      <EncoreBlockingJobProvider>
        <EncoreProviderImpl>{children}</EncoreProviderImpl>
      </EncoreBlockingJobProvider>
    </LabsUndoProvider>
  );
}

function EncoreProviderImpl({ children }: { children: React.ReactNode }): React.ReactElement {
  const { push: pushUndo, isReplayingRef, clear: clearUndoStack } = useLabsUndo();
  const { withBlockingJob } = useEncoreBlockingJobs();
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

        /* No automatic GIS calls on first paint — even prompt: 'none' can
           surface a popup or iframe overlay in some browsers, and the
           README documents that "Sign in with Google" must be explicit.
           If the locally-stored token is still within its saved expiry
           window, verify it silently against Google; otherwise clear it
           and let the user click sign-in. */
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
            /* fall through to clear */
          }
          if (!cancelled) clearPersistedGoogleSession();
        } else if (stored) {
          clearPersistedGoogleSession();
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

  const runSync = useCallback(async () => {
    if (!googleAccessToken) return;
    await withBlockingJob('Syncing with Google Drive…', async () => {
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
    });
  }, [googleAccessToken, refreshLibrary, withBlockingJob]);

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
      // Wrap in a *silent* blocking job: the snackbar stays hidden (so the
      // autosave-driven push isn't a noisy distraction on every keystroke),
      // but the beforeunload guard still fires so users aren't surprised by a
      // half-written push when they close the tab. See PR 4 of the Encore
      // quality sweep.
      await withBlockingJob(
        'Saving to Drive…',
        async () => {
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
        },
        { silent: true },
      );
    })();
  }, [googleAccessToken, withBlockingJob]);

  const saveRepertoireExtras = useCallback(
    async (patch: Partial<Omit<RepertoireExtrasRow, 'id'>>) => {
      const now = new Date().toISOString();
      const cur = (await encoreDb.repertoireExtras.get('default')) ?? defaultRepertoireExtrasRow(now);
      const next: RepertoireExtrasRow = { ...cur, ...patch, id: 'default', updatedAt: now };
      const prevSnap = cloneEncoreUndoSnapshot(cur);
      const nextSnap = cloneEncoreUndoSnapshot(next);
      await encoreDb.repertoireExtras.put(next);
      setRepertoireExtras(next);
      scheduleBackgroundSync();
      if (!isReplayingRef.current) {
        pushUndo({
          undo: async () => {
            await encoreDb.repertoireExtras.put(prevSnap);
            setRepertoireExtras(prevSnap);
            scheduleBackgroundSync();
          },
          redo: async () => {
            await encoreDb.repertoireExtras.put(nextSnap);
            setRepertoireExtras(nextSnap);
            scheduleBackgroundSync();
          },
        });
      }
    },
    [isReplayingRef, pushUndo, scheduleBackgroundSync],
  );

  const saveSong = useCallback(
    async (song: EncoreSong, options?: { silentUndo?: boolean }) => {
      const previous = await encoreDb.songs.get(song.id);
      const synced = syncSongLegacyMediaIds(song);
      const prevSnap = previous ? cloneEncoreUndoSnapshot(previous) : undefined;
      const nextSnap = cloneEncoreUndoSnapshot(synced);
      await encoreDb.songs.put(synced);
      await refreshLibrary();
      scheduleBackgroundSync();
      if (googleAccessToken && previous && previous.title !== synced.title) {
        void (async () => {
          try {
            const songPerformances = await encoreDb.performances.where('songId').equals(song.id).toArray();
            await Promise.all(
              songPerformances
                .filter((p) => p.videoShortcutDriveFileId || p.videoTargetDriveFileId)
                .map((p) =>
                  syncPerformanceVideoFileName(googleAccessToken, p, synced).catch((err) => {
                    serverLogger.warn('encore.saveSong: video rename failed', err);
                  }),
                ),
            );
          } catch (err) {
            serverLogger.warn('encore.saveSong: video rename batch failed', err);
          }
        })();
      }
      if (!isReplayingRef.current && !options?.silentUndo) {
        const id = synced.id;
        pushUndo({
          undo: async () => {
            if (prevSnap) {
              await encoreDb.songs.put(prevSnap);
            } else {
              await encoreDb.songs.delete(id);
            }
            await refreshLibrary();
            scheduleBackgroundSync();
          },
          redo: async () => {
            await encoreDb.songs.put(nextSnap);
            await refreshLibrary();
            scheduleBackgroundSync();
          },
        });
      }
    },
    [googleAccessToken, isReplayingRef, pushUndo, refreshLibrary, scheduleBackgroundSync],
  );

  const deleteSong = useCallback(
    async (id: string) => {
      const prevSong = await encoreDb.songs.get(id);
      if (!prevSong) return;
      const prevPerfs = await encoreDb.performances.where('songId').equals(id).toArray();
      const songSnap = cloneEncoreUndoSnapshot(prevSong);
      const perfsSnap = prevPerfs.map((p) => cloneEncoreUndoSnapshot(p));
      await encoreDb.songs.delete(id);
      await encoreDb.performances.where('songId').equals(id).delete();
      await refreshLibrary();
      scheduleBackgroundSync();
      if (!isReplayingRef.current) {
        pushUndo({
          undo: async () => {
            await encoreDb.songs.put(songSnap);
            for (const perf of perfsSnap) {
              await encoreDb.performances.put(perf);
            }
            await refreshLibrary();
            scheduleBackgroundSync();
          },
          redo: async () => {
            await encoreDb.songs.delete(id);
            await encoreDb.performances.where('songId').equals(id).delete();
            await refreshLibrary();
            scheduleBackgroundSync();
          },
        });
      }
    },
    [isReplayingRef, pushUndo, refreshLibrary, scheduleBackgroundSync],
  );

  const savePerformance = useCallback(
    async (p: EncorePerformance, options?: { silentUndo?: boolean }) => {
      const previous = await encoreDb.performances.get(p.id);
      const prevSnap = previous ? cloneEncoreUndoSnapshot(previous) : undefined;
      const nextSnap = cloneEncoreUndoSnapshot(p);
      await encoreDb.performances.put(p);
      await refreshLibrary();
      scheduleBackgroundSync();
      if (!isReplayingRef.current && !options?.silentUndo) {
        pushUndo({
          undo: async () => {
            if (prevSnap) {
              await encoreDb.performances.put(prevSnap);
            } else {
              await encoreDb.performances.delete(p.id);
            }
            await refreshLibrary();
            scheduleBackgroundSync();
          },
          redo: async () => {
            await encoreDb.performances.put(nextSnap);
            await refreshLibrary();
            scheduleBackgroundSync();
          },
        });
      }
      // Best-effort: ensure Drive footprint matches (create missing shortcut for picked
      // files, rename to canonical naming when relevant metadata changed).
      if (googleAccessToken && p.videoTargetDriveFileId) {
        void (async () => {
          try {
            const song = (await encoreDb.songs.get(p.songId)) ?? null;
            const result = await syncPerformanceVideo(googleAccessToken, p, song);
            if (result.shortcutCreatedId && result.shortcutCreatedId !== p.videoShortcutDriveFileId) {
              await encoreDb.performances.put({
                ...p,
                videoShortcutDriveFileId: result.shortcutCreatedId,
                updatedAt: new Date().toISOString(),
              });
              await refreshLibrary();
              scheduleBackgroundSync();
            }
          } catch (err) {
            serverLogger.warn('encore.savePerformance: video shortcut sync failed', err);
          }
        })();
      }
    },
    [googleAccessToken, isReplayingRef, pushUndo, refreshLibrary, scheduleBackgroundSync],
  );

  const deletePerformance = useCallback(
    async (id: string) => {
      const prev = await encoreDb.performances.get(id);
      if (!prev) return;
      const snap = cloneEncoreUndoSnapshot(prev);
      await encoreDb.performances.delete(id);
      await refreshLibrary();
      scheduleBackgroundSync();
      if (!isReplayingRef.current) {
        pushUndo({
          undo: async () => {
            await encoreDb.performances.put(snap);
            await refreshLibrary();
            scheduleBackgroundSync();
          },
          redo: async () => {
            await encoreDb.performances.delete(id);
            await refreshLibrary();
            scheduleBackgroundSync();
          },
        });
      }
    },
    [isReplayingRef, pushUndo, refreshLibrary, scheduleBackgroundSync],
  );

  const resolveConflictRemote = useCallback(async () => {
    if (!googleAccessToken) return;
    await withBlockingJob('Resolving conflict (using Google Drive)…', async () => {
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
    });
  }, [googleAccessToken, refreshLibrary, withBlockingJob]);

  const resolveConflictLocal = useCallback(async () => {
    if (!googleAccessToken) return;
    await withBlockingJob('Resolving conflict (keeping this device)…', async () => {
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
    });
  }, [googleAccessToken, refreshLibrary, withBlockingJob]);

  const dismissConflict = useCallback(() => {
    setConflict(null);
    setSyncState('idle');
  }, []);

  const effectiveDisplayName = useMemo<string | null>(() => {
    const override = repertoireExtras.ownerDisplayName?.trim();
    if (override) return override;
    return displayName?.trim() || null;
  }, [repertoireExtras.ownerDisplayName, displayName]);

  const publishPublicSnapshot = useCallback(
    async (options?: BuildPublicSnapshotOptions) => {
      if (!googleAccessToken) throw new Error('Not signed in');
      return withBlockingJob('Publishing guest snapshot…', () =>
        publishSnapshotToDrive(googleAccessToken, options, effectiveDisplayName),
      );
    },
    [googleAccessToken, effectiveDisplayName, withBlockingJob],
  );

  const reorganizeDriveUploads = useCallback(async () => {
    if (!googleAccessToken) throw new Error('Not signed in');
    return withBlockingJob('Organizing files in Google Drive…', () => reorganizeAllDriveUploads(googleAccessToken));
  }, [googleAccessToken, withBlockingJob]);

  const setOwnerDisplayName = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      const now = new Date().toISOString();
      const cur =
        (await encoreDb.repertoireExtras.get('default')) ?? defaultRepertoireExtrasRow(now);
      const next: RepertoireExtrasRow = {
        ...cur,
        id: 'default',
        ownerDisplayName: trimmed || undefined,
        updatedAt: now,
      };
      const prevSnap = cloneEncoreUndoSnapshot(cur);
      const nextSnap = cloneEncoreUndoSnapshot(next);
      await encoreDb.repertoireExtras.put(next);
      setRepertoireExtras(next);
      scheduleBackgroundSync();
      if (!isReplayingRef.current) {
        pushUndo({
          undo: async () => {
            await encoreDb.repertoireExtras.put(prevSnap);
            setRepertoireExtras(prevSnap);
            scheduleBackgroundSync();
          },
          redo: async () => {
            await encoreDb.repertoireExtras.put(nextSnap);
            setRepertoireExtras(nextSnap);
            scheduleBackgroundSync();
          },
        });
      }
    },
    [isReplayingRef, pushUndo, scheduleBackgroundSync],
  );

  const value = useMemo<EncoreContextValue>(
    () => ({
      googleAuthReady,
      googleAccessToken,
      googleGateBypassed,
      displayName,
      effectiveDisplayName,
      setOwnerDisplayName,
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
      reorganizeDriveUploads,
    }),
    [
      googleAuthReady,
      googleAccessToken,
      googleGateBypassed,
      displayName,
      effectiveDisplayName,
      setOwnerDisplayName,
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
      reorganizeDriveUploads,
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
