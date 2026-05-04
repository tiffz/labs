/* eslint-disable react-refresh/only-export-components -- file exports Provider + context only; useEncoreSync lives in useEncoreSync.ts for Fast Refresh */
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { getSyncMeta } from '../db/encoreDb';
import {
  pushRepertoireToDrive,
  resolveConflictKeepLocal,
  resolveConflictUseRemoteThenPush,
  resolveConflictWithChoices as resolveConflictWithChoicesDrive,
  runInitialSyncIfPossible,
  type ConflictAnalysis,
  type SyncCheckResult,
} from '../drive/repertoireSync';
import {
  isShardedSyncEnabled,
  migrateMonolithicToShardedIfNeeded,
  pushDirtyShards,
} from '../drive/repertoireSharded';
import { useEncoreAuth } from './EncoreAuthContext';
import { useEncoreBlockingJobs } from './EncoreBlockingJobContext';
import { useEncoreLibraryReady } from './EncoreLibraryContext';

export type SyncUiState = 'idle' | 'syncing' | 'error' | 'conflict';

/** Fired after the merge half of a silent auto-merge completes; consumers can show a toast. */
export type SilentAutoMergeSummary = {
  localOnlyCount: number;
  remoteOnlyCount: number;
};

/**
 * Sync surface: Drive sync state machine, conflict view, debounced background push.
 */
export interface EncoreSyncContextValue {
  syncState: SyncUiState;
  syncMessage: string | null;
  /** Re-run Drive bootstrap / pull. No-op when not signed in. */
  retryDriveSync: () => Promise<void>;
  /** Debounced silent push of `repertoire_data.json`. Coalesces rapid local writes. */
  scheduleBackgroundSync: () => void;
  /** Set when `runInitialSyncIfPossible` returns a row-level conflict that needs user input. */
  conflict: SyncCheckResult | null;
  /** Detailed analysis (which rows conflict / which are auto-mergeable) — populated alongside `conflict`. */
  conflictAnalysis: ConflictAnalysis | null;
  /** Resolve every "both edited" row at once with the user's per-row choice. */
  resolveConflictWithChoices: (choices: Map<string, 'local' | 'remote'>) => Promise<void>;
  /** Convenience: pick "use Drive everywhere". */
  resolveConflictRemote: () => Promise<void>;
  /** Convenience: pick "keep this device everywhere". */
  resolveConflictLocal: () => Promise<void>;
  dismissConflict: () => void;
  /** Most recent silent auto-merge summary; cleared after toasting. */
  lastSilentMerge: SilentAutoMergeSummary | null;
  acknowledgeSilentMerge: () => void;
}

export const EncoreSyncContext = createContext<EncoreSyncContextValue | null>(null);

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export function EncoreSyncProvider({ children }: { children: ReactNode }): ReactElement {
  const { googleAccessToken } = useEncoreAuth();
  const libraryReady = useEncoreLibraryReady();
  const { withBlockingJob } = useEncoreBlockingJobs();

  const [syncState, setSyncState] = useState<SyncUiState>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState<SyncCheckResult | null>(null);
  const [conflictAnalysis, setConflictAnalysis] = useState<ConflictAnalysis | null>(null);
  const [lastSilentMerge, setLastSilentMerge] = useState<SilentAutoMergeSummary | null>(null);

  const googleAccessTokenRef = useRef<string | null>(null);
  googleAccessTokenRef.current = googleAccessToken;

  const drivePushDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drivePushChainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!googleAccessToken) {
      drivePushChainRef.current = Promise.resolve();
      if (drivePushDebounceTimerRef.current) {
        clearTimeout(drivePushDebounceTimerRef.current);
        drivePushDebounceTimerRef.current = null;
      }
    }
  }, [googleAccessToken]);

  useEffect(() => {
    return () => {
      if (drivePushDebounceTimerRef.current) {
        clearTimeout(drivePushDebounceTimerRef.current);
      }
    };
  }, []);

  const runSync = useCallback(async () => {
    const token = googleAccessTokenRef.current;
    if (!token) return;
    await withBlockingJob(
      'Syncing with Google Drive…',
      async (setProgress) => {
        setSyncState('syncing');
        setSyncMessage(null);
        setProgress(0.02);
        const result = await runInitialSyncIfPossible(token, {
          onProgress: (p) => setProgress(p == null ? null : 0.02 + p * 0.96),
        });
        if (!result.ok && result.conflict?.conflict) {
          // Phase 4: try silent auto-merge first.
          if (result.analysis && result.analysis.bothEdited.length === 0) {
            const summary: SilentAutoMergeSummary = {
              localOnlyCount: result.analysis.localOnly.length,
              remoteOnlyCount: result.analysis.remoteOnly.length,
            };
            try {
              await resolveConflictWithChoicesDrive(token, new Map());
              setSyncState('idle');
              setConflict(null);
              setConflictAnalysis(null);
              setLastSilentMerge(summary);
            } catch (e) {
              setSyncState('error');
              setSyncMessage(e instanceof Error ? e.message : String(e));
            }
            setProgress(1);
            return;
          }
          setSyncState('conflict');
          setConflict(result.conflict);
          setConflictAnalysis(result.analysis ?? null);
          setProgress(1);
          return;
        }
        if (!result.ok && result.error) {
          setSyncState('error');
          setSyncMessage(result.error);
          setProgress(1);
          return;
        }
        setSyncState('idle');
        setConflict(null);
        setConflictAnalysis(null);
        setProgress(1);
      },
      { silent: true },
    );
  }, [withBlockingJob]);

  const retryDriveSync = useCallback(async () => {
    await runSync();
  }, [runSync]);

  const lastAutoSyncTokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (!googleAccessToken) {
      lastAutoSyncTokenRef.current = null;
      return;
    }
    if (!libraryReady) return;
    if (lastAutoSyncTokenRef.current === googleAccessToken) return;
    lastAutoSyncTokenRef.current = googleAccessToken;
    const tokenAtSchedule = googleAccessToken;
    void (async () => {
      await waitForNextPaint();
      if (googleAccessTokenRef.current !== tokenAtSchedule) return;
      await runSync();
    })();
  }, [googleAccessToken, libraryReady, runSync]);

  const scheduleBackgroundSync = useCallback(() => {
    if (!googleAccessTokenRef.current) return;
    if (drivePushDebounceTimerRef.current) clearTimeout(drivePushDebounceTimerRef.current);
    drivePushDebounceTimerRef.current = setTimeout(() => {
      drivePushDebounceTimerRef.current = null;
      drivePushChainRef.current = drivePushChainRef.current
        .catch(() => undefined)
        .then(async () => {
          const token = googleAccessTokenRef.current;
          if (!token) return;
          await withBlockingJob(
            'Saving to Drive…',
            async () => {
              try {
                if (isShardedSyncEnabled()) {
                  // Phase 5: drain only the rows the user actually touched. The legacy monolithic
                  // push still runs in the same callback as a safety net so a bad shard write
                  // does not strand the user's edits in IndexedDB.
                  await migrateMonolithicToShardedIfNeeded(token);
                  await pushDirtyShards(token);
                }
                const meta = await getSyncMeta();
                if (!meta.repertoireFileId) return;
                await pushRepertoireToDrive(token, meta.repertoireFileId, meta.lastRemoteEtag);
                setSyncState('idle');
                setSyncMessage(null);
              } catch (e) {
                setSyncState('error');
                setSyncMessage(e instanceof Error ? e.message : String(e));
              }
            },
            { silent: true },
          );
        });
      void drivePushChainRef.current;
    }, 500);
  }, [withBlockingJob]);

  const resolveConflictRemote = useCallback(async () => {
    const token = googleAccessTokenRef.current;
    if (!token) return;
    await withBlockingJob('Resolving conflict (using Google Drive)…', async () => {
      setSyncState('syncing');
      try {
        await resolveConflictUseRemoteThenPush(token);
        setConflict(null);
        setConflictAnalysis(null);
        setSyncState('idle');
      } catch (e) {
        setSyncState('error');
        setSyncMessage(e instanceof Error ? e.message : String(e));
      }
    });
  }, [withBlockingJob]);

  const resolveConflictLocal = useCallback(async () => {
    const token = googleAccessTokenRef.current;
    if (!token) return;
    await withBlockingJob('Resolving conflict (keeping this device)…', async () => {
      setSyncState('syncing');
      try {
        await resolveConflictKeepLocal(token);
        setConflict(null);
        setConflictAnalysis(null);
        setSyncState('idle');
      } catch (e) {
        setSyncState('error');
        setSyncMessage(e instanceof Error ? e.message : String(e));
      }
    });
  }, [withBlockingJob]);

  const resolveConflictWithChoices = useCallback(
    async (choices: Map<string, 'local' | 'remote'>) => {
      const token = googleAccessTokenRef.current;
      if (!token) return;
      await withBlockingJob('Merging changes with Google Drive…', async () => {
        setSyncState('syncing');
        try {
          await resolveConflictWithChoicesDrive(token, choices);
          setConflict(null);
          setConflictAnalysis(null);
          setSyncState('idle');
        } catch (e) {
          setSyncState('error');
          setSyncMessage(e instanceof Error ? e.message : String(e));
        }
      });
    },
    [withBlockingJob],
  );

  const dismissConflict = useCallback(() => {
    setConflict(null);
    setConflictAnalysis(null);
    setSyncState('idle');
  }, []);

  const acknowledgeSilentMerge = useCallback(() => {
    setLastSilentMerge(null);
  }, []);

  const value = useMemo<EncoreSyncContextValue>(
    () => ({
      syncState,
      syncMessage,
      retryDriveSync,
      scheduleBackgroundSync,
      conflict,
      conflictAnalysis,
      resolveConflictWithChoices,
      resolveConflictRemote,
      resolveConflictLocal,
      dismissConflict,
      lastSilentMerge,
      acknowledgeSilentMerge,
    }),
    [
      syncState,
      syncMessage,
      retryDriveSync,
      scheduleBackgroundSync,
      conflict,
      conflictAnalysis,
      resolveConflictWithChoices,
      resolveConflictRemote,
      resolveConflictLocal,
      dismissConflict,
      lastSilentMerge,
      acknowledgeSilentMerge,
    ],
  );

  return <EncoreSyncContext.Provider value={value}>{children}</EncoreSyncContext.Provider>;
}
