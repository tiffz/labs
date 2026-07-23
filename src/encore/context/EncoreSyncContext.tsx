import {
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
import {
  pullChangedOriginalsShards,
  pushOriginalsDirtyShards,
} from '../originals/drive/originalsSharded';
import { useEncoreAuth } from './EncoreAuthContext';
import { useEncoreBlockingJobs } from './EncoreBlockingJobContext';
import { useEncoreLibraryReady } from './EncoreLibraryContext';
import {
  EncoreSyncContext,
  type EncoreSyncContextValue,
  type SilentAutoMergeSummary,
  type SyncUiState,
} from './encoreSyncContextStore';

export type { SyncUiState, SilentAutoMergeSummary, EncoreSyncContextValue };
export { EncoreSyncContext };

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function waitForIdle(timeoutMs = 1200): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: timeoutMs });
      return;
    }
    window.setTimeout(resolve, Math.min(timeoutMs, 400));
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

  /**
   * Auto-push data-loss gate (P0): the background push must not run until a reconciling pull has
   * succeeded this session. Otherwise a fresh/empty device that edits within the ~1200ms initial
   * pull window pushes with no `If-Match` and clobbers richer cloud data (DRIVE_SYNC_DATA_LOSS_
   * PREVENTION Layer 2; equivalent to `labsDriveAutoPushAllowed`). Edits made before the first pull
   * stay in Dexie (the pull unions them in) and flush once the pull completes.
   */
  const sessionPullSucceededRef = useRef(false);
  const pendingBackgroundPushRef = useRef(false);
  // Populated by an effect (never mutated during render) so the earlier-defined runSync can flush a
  // deferred push once the reconciling pull opens the gate, without a forward reference.
  const markSessionReconciledRef = useRef<(() => void) | null>(null);

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
              markSessionReconciledRef.current?.();
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
        // Reconciling sync succeeded (pull, guarded push, or already-in-sync) — open the auto-push
        // gate and flush any edits deferred during the initial-pull window.
        markSessionReconciledRef.current?.();
        try {
          await pullChangedOriginalsShards(token);
          await pushOriginalsDirtyShards(token);
        } catch {
          /* originals sync is best-effort on full sync */
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
      await waitForIdle();
      if (googleAccessTokenRef.current !== tokenAtSchedule) return;
      await runSync();
    })();
  }, [googleAccessToken, libraryReady, runSync]);

  /**
   * Run the background push now (coalesced through `drivePushChainRef`). Extracted so both the
   * debounced timer and the flush-on-hide handler share one push path — the latter shortens the
   * "local-only" window so high-value edits (e.g. exercise answers) reach Drive + revision history
   * before the tab is backgrounded/closed, which is what makes them recoverable later (ADR 0019).
   */
  const runBackgroundPushNow = useCallback(() => {
    // Gate: defer every auto-push until a reconciling pull has succeeded this session. The pending
    // flag lets the post-pull success path flush the edits that accrued during the pull window.
    if (!sessionPullSucceededRef.current) {
      pendingBackgroundPushRef.current = true;
      return;
    }
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
              await pushRepertoireToDrive(token, meta.repertoireFileId, meta.lastRemoteEtag, {
                // Guaranteed allowed: runBackgroundPushNow returns early until the session pull succeeds.
                writeGuard: { autoPushAllowed: true },
              });
              await pushOriginalsDirtyShards(token);
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
  }, [withBlockingJob]);

  const scheduleBackgroundSync = useCallback(() => {
    if (!googleAccessTokenRef.current) return;
    if (drivePushDebounceTimerRef.current) clearTimeout(drivePushDebounceTimerRef.current);
    drivePushDebounceTimerRef.current = setTimeout(() => {
      drivePushDebounceTimerRef.current = null;
      runBackgroundPushNow();
    }, 500);
  }, [runBackgroundPushNow]);

  /**
   * Open the auto-push gate after a reconciling pull/merge and flush any push that was deferred while
   * the gate was closed (fresh-device initial-pull window). Exposed via a ref so the earlier-defined
   * sync flows can call it without a forward reference.
   */
  const markSessionReconciled = useCallback(() => {
    sessionPullSucceededRef.current = true;
    if (pendingBackgroundPushRef.current) {
      pendingBackgroundPushRef.current = false;
      runBackgroundPushNow();
    }
  }, [runBackgroundPushNow]);

  useEffect(() => {
    markSessionReconciledRef.current = markSessionReconciled;
  }, [markSessionReconciled]);

  /**
   * Flush a pending debounced push the moment the tab is hidden or unloaded. Without this a user who
   * fills answers and immediately closes the tab can leave that content local-only until their next
   * session — exactly the window where a later destructive sync can lose data that never reached
   * Drive. Fires on `visibilitychange→hidden` (still alive enough to start the fetch) and `pagehide`.
   */
  useEffect(() => {
    const flushIfPending = () => {
      if (!googleAccessTokenRef.current) return;
      if (!drivePushDebounceTimerRef.current) return;
      clearTimeout(drivePushDebounceTimerRef.current);
      drivePushDebounceTimerRef.current = null;
      runBackgroundPushNow();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushIfPending();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flushIfPending);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flushIfPending);
    };
  }, [runBackgroundPushNow]);

  const resolveConflictRemote = useCallback(async () => {
    const token = googleAccessTokenRef.current;
    if (!token) return;
    await withBlockingJob('Resolving conflict (using Google Drive)…', async () => {
      setSyncState('syncing');
      try {
        await resolveConflictUseRemoteThenPush(token);
        markSessionReconciledRef.current?.();
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
        markSessionReconciledRef.current?.();
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
          markSessionReconciledRef.current?.();
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
    // "Decide later" leaves local edits diverged from Drive, so surface "not backed up" instead of a
    // false "Backed up" (S4). If an earlier pull already opened the auto-push gate, a later edit's
    // push 412s on the stale etag and flips to "error" — also honest, and If-Match blocks the clobber.
    setSyncState('deferred');
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
