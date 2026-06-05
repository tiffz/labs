import { useEffect, useRef } from 'react';
import {
  LABS_DRIVE_AUTO_PUSH_DEBOUNCE_MS,
  LABS_DRIVE_AUTO_PUSH_MIN_INTERVAL_MS,
} from './labsDrivePortfolioBackupConstants';
import { formatLabsDriveSyncError } from './labsDriveSyncMessages';

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
  subscribeLocalChanges: (onChange: () => void) => () => void;
};

/**
 * Shared session lifecycle for portfolio Drive backup apps:
 * - One silent auto-pull per enabled session
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

  useEffect(() => {
    if (!enabled || autoPullStartedRef.current) return;
    autoPullStartedRef.current = true;
    void (async () => {
      try {
        const result = await pullRef.current({ silent: true });
        await afterPullRef.current?.(result);
      } catch (e) {
        onAutoPullError(formatLabsDriveSyncError(e, 'auto-pull'));
      }
    })();
  }, [enabled, onAutoPullError]);

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
    const onChange = () => {
      if (mergeBusyRef.current()) return;
      if (!primed) {
        primed = true;
        return;
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
