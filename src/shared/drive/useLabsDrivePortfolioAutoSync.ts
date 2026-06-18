import { useCallback, useEffect, useRef } from 'react';
import {
  LABS_DRIVE_AUTO_PULL_INTERVAL_MS,
  LABS_DRIVE_AUTO_PULL_MIN_INTERVAL_MS,
  LABS_DRIVE_AUTO_PUSH_DEBOUNCE_MS,
  LABS_DRIVE_AUTO_PUSH_MIN_INTERVAL_MS,
} from './labsDrivePortfolioBackupConstants';
import { formatLabsDriveSyncError } from './labsDriveSyncMessages';

export type LabsDrivePortfolioLocalChangeEvent = {
  /** Bypass the one-time priming skip (first import / bulk edit should push). */
  immediate?: boolean;
};

export type UseLabsDrivePortfolioAutoSyncOptions = {
  enabled: boolean;
  allowAutoPush: () => boolean;
  pullFromDriveAndMerge: (opts?: { silent?: boolean }) => Promise<unknown>;
  flushDriveWrite: (opts?: { silent?: boolean }) => Promise<unknown>;
  /** Return true while merge writes should not schedule auto-push. */
  isMergeInProgress: () => boolean;
  onAutoPullError: (message: string) => void;
  onAutoPushError: (message: string) => void;
  /** Optional follow-up after silent auto-pull (e.g. push deduped library). */
  afterSilentAutoPull?: (pullResult: unknown) => Promise<void>;
  /** Subscribe to local data changes; call `onChange` when user edits should trigger debounced push. */
  subscribeLocalChanges: (onChange: (event?: LabsDrivePortfolioLocalChangeEvent) => void) => () => void;
};

/**
 * Shared session lifecycle for portfolio Drive backup apps:
 * - Silent auto-pull on session start, periodically while visible, and on tab focus
 * - Debounced auto-push after local edits (gated by allowAutoPush)
 */
export function useLabsDrivePortfolioAutoSync(options: UseLabsDrivePortfolioAutoSyncOptions): {
  notifyAutoPushCompleted: () => void;
} {
  const {
    enabled,
    allowAutoPush,
    pullFromDriveAndMerge,
    flushDriveWrite,
    isMergeInProgress,
    onAutoPullError,
    onAutoPushError,
    afterSilentAutoPull,
    subscribeLocalChanges,
  } = options;

  const autoPullStartedRef = useRef(false);
  const autoPushTimerRef = useRef<number | null>(null);
  const autoPushInFlightRef = useRef(false);
  const lastAutoPushAtRef = useRef(0);
  const lastAutoPullAtRef = useRef(0);
  const periodicPullTimerRef = useRef<number | null>(null);
  const visibilityPullTimerRef = useRef<number | null>(null);
  const pullInFlightRef = useRef(false);

  const pullRef = useRef(pullFromDriveAndMerge);
  pullRef.current = pullFromDriveAndMerge;
  const flushRef = useRef(flushDriveWrite);
  flushRef.current = flushDriveWrite;
  const afterPullRef = useRef(afterSilentAutoPull);
  afterPullRef.current = afterSilentAutoPull;
  const allowPushRef = useRef(allowAutoPush);
  allowPushRef.current = allowAutoPush;
  const mergeBusyRef = useRef(isMergeInProgress);
  mergeBusyRef.current = isMergeInProgress;
  const onAutoPullErrorRef = useRef(onAutoPullError);
  onAutoPullErrorRef.current = onAutoPullError;

  const runSilentPull = useCallback(async () => {
    if (pullInFlightRef.current || mergeBusyRef.current()) return;
    pullInFlightRef.current = true;
    try {
      const result = await pullRef.current({ silent: true });
      lastAutoPullAtRef.current = Date.now();
      await afterPullRef.current?.(result);
    } catch (e) {
      onAutoPullErrorRef.current(formatLabsDriveSyncError(e, 'auto-pull'));
    } finally {
      pullInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled || autoPullStartedRef.current) return;
    autoPullStartedRef.current = true;
    void runSilentPull();
  }, [enabled, runSilentPull]);

  useEffect(() => {
    if (!enabled) return;

    const scheduleVisibilityPull = () => {
      if (document.visibilityState !== 'visible') return;
      const sinceLast = Date.now() - lastAutoPullAtRef.current;
      if (sinceLast < LABS_DRIVE_AUTO_PULL_MIN_INTERVAL_MS) return;
      if (visibilityPullTimerRef.current != null) {
        window.clearTimeout(visibilityPullTimerRef.current);
      }
      visibilityPullTimerRef.current = window.setTimeout(() => {
        visibilityPullTimerRef.current = null;
        void runSilentPull();
      }, 500);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        scheduleVisibilityPull();
      }
    };

    periodicPullTimerRef.current = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const sinceLast = Date.now() - lastAutoPullAtRef.current;
      if (sinceLast < LABS_DRIVE_AUTO_PULL_MIN_INTERVAL_MS) return;
      void runSilentPull();
    }, LABS_DRIVE_AUTO_PULL_INTERVAL_MS);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', scheduleVisibilityPull);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', scheduleVisibilityPull);
      if (periodicPullTimerRef.current != null) {
        window.clearInterval(periodicPullTimerRef.current);
        periodicPullTimerRef.current = null;
      }
      if (visibilityPullTimerRef.current != null) {
        window.clearTimeout(visibilityPullTimerRef.current);
        visibilityPullTimerRef.current = null;
      }
    };
  }, [enabled, runSilentPull]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const schedule = () => {
      if (cancelled || mergeBusyRef.current()) return;
      if (autoPushTimerRef.current != null) {
        window.clearTimeout(autoPushTimerRef.current);
      }
      autoPushTimerRef.current = window.setTimeout(() => {
        autoPushTimerRef.current = null;
        if (cancelled || !allowPushRef.current() || autoPushInFlightRef.current) return;
        const sinceLast = Date.now() - lastAutoPushAtRef.current;
        if (sinceLast < LABS_DRIVE_AUTO_PUSH_MIN_INTERVAL_MS) {
          schedule();
          return;
        }
        autoPushInFlightRef.current = true;
        void (async () => {
          try {
            await flushRef.current({ silent: true });
            lastAutoPushAtRef.current = Date.now();
          } catch (e) {
            onAutoPushError(formatLabsDriveSyncError(e, 'auto-push'));
          } finally {
            autoPushInFlightRef.current = false;
          }
        })();
      }, LABS_DRIVE_AUTO_PUSH_DEBOUNCE_MS);
    };

    let primed = false;
    const onChange = (event?: LabsDrivePortfolioLocalChangeEvent) => {
      if (mergeBusyRef.current()) return;
      if (!event?.immediate) {
        if (!primed) {
          primed = true;
          return;
        }
      }
      schedule();
    };

    const unsub = subscribeLocalChanges(onChange);
    return () => {
      cancelled = true;
      unsub();
      if (autoPushTimerRef.current != null) {
        window.clearTimeout(autoPushTimerRef.current);
        autoPushTimerRef.current = null;
      }
    };
  }, [enabled, onAutoPushError, subscribeLocalChanges]);

  return {
    notifyAutoPushCompleted: () => {
      lastAutoPushAtRef.current = Date.now();
    },
  };
}
