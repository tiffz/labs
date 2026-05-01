/* eslint-disable react-refresh/only-export-components */
import type { MutableRefObject } from 'react';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { isLabsUndoHotkeySuppressedTarget } from './isLabsUndoHotkeySuppressedTarget';
import {
  combineUndoCommits,
  createLabsUndoStack,
  type LabsUndoBatchQueue,
  type LabsUndoCommit,
} from './labsUndoStack';

export type LabsUndoContextValue = {
  push: (commit: LabsUndoCommit) => void;
  /**
   * Collect many small commits into one undo entry.
   *
   * Useful for bulk operations (e.g. import flows) where pushing one entry
   * per row would flood the stack and force the user to undo dozens of times.
   *
   * While `fn` is running, *all* downstream `push(commit)` calls (including
   * from action methods like `EncoreContext.saveSong`) are transparently
   * redirected into the batch queue rather than committed individually. After
   * `fn` resolves, the collected entries are folded into a single combined
   * commit on the stack. The optional `queue` callback is also available for
   * call sites that want to capture commits explicitly.
   *
   * If the function throws, no commit is added (caller is responsible for any
   * compensating cleanup). If zero entries are queued, nothing is pushed.
   */
  withBatch: <T>(fn: (queue: LabsUndoBatchQueue) => Promise<T> | T) => Promise<T>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  clear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** True while a stack undo/redo callback runs; persistence layers should skip pushing history. */
  isReplayingRef: MutableRefObject<boolean>;
};

const LabsUndoContext = createContext<LabsUndoContextValue | null>(null);

export function LabsUndoProvider({
  children,
  enabled = true,
}: {
  children: React.ReactNode;
  /** When false, hotkeys and push are no-ops. */
  enabled?: boolean;
}): React.ReactElement {
  const stackRef = useRef(createLabsUndoStack());
  const replayRef = useRef(false);
  const busyRef = useRef(false);
  const batchRef = useRef<LabsUndoCommit[] | null>(null);
  const [stackTick, setStackTick] = useState(0);
  const bump = useCallback(() => setStackTick((t) => t + 1), []);

  const push = useCallback(
    (commit: LabsUndoCommit) => {
      if (!enabled || replayRef.current) return;
      if (batchRef.current) {
        batchRef.current.push(commit);
        return;
      }
      stackRef.current.push(commit);
      bump();
    },
    [enabled, bump],
  );

  const withBatch = useCallback(
    async <T,>(fn: (queue: LabsUndoBatchQueue) => Promise<T> | T): Promise<T> => {
      if (!enabled || replayRef.current) {
        const noopQueue: LabsUndoBatchQueue = {
          push: () => undefined,
          size: () => 0,
        };
        return await fn(noopQueue);
      }
      if (batchRef.current) {
        // Already inside a batch — flatten so nesting collapses into the outer entry.
        const outer = batchRef.current;
        const queue: LabsUndoBatchQueue = {
          push: (commit) => outer.push(commit),
          size: () => outer.length,
        };
        return await fn(queue);
      }
      const collected: LabsUndoCommit[] = [];
      const queue: LabsUndoBatchQueue = {
        push: (commit) => {
          collected.push(commit);
        },
        size: () => collected.length,
      };
      batchRef.current = collected;
      try {
        const result = await fn(queue);
        const combined = combineUndoCommits(collected);
        if (combined) {
          stackRef.current.push(combined);
          bump();
        }
        return result;
      } finally {
        batchRef.current = null;
      }
    },
    [enabled, bump],
  );

  const runUndo = useCallback(async () => {
    if (!enabled || busyRef.current || !stackRef.current.canUndo) return;
    busyRef.current = true;
    replayRef.current = true;
    try {
      await stackRef.current.undo();
      bump();
    } finally {
      replayRef.current = false;
      busyRef.current = false;
    }
  }, [enabled, bump]);

  const runRedo = useCallback(async () => {
    if (!enabled || busyRef.current || !stackRef.current.canRedo) return;
    busyRef.current = true;
    replayRef.current = true;
    try {
      await stackRef.current.redo();
      bump();
    } finally {
      replayRef.current = false;
      busyRef.current = false;
    }
  }, [enabled, bump]);

  const clear = useCallback(() => {
    stackRef.current.clear();
    bump();
  }, [bump]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      if (isLabsUndoHotkeySuppressedTarget(e.target)) return;
      const key = e.key.toLowerCase();
      const redo = (key === 'z' && e.shiftKey) || key === 'y';
      const undo = key === 'z' && !e.shiftKey;
      if (!undo && !redo) return;
      const st = stackRef.current;
      if (undo && !st.canUndo) return;
      if (redo && !st.canRedo) return;
      e.preventDefault();
      void (redo ? runRedo() : runUndo());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, runUndo, runRedo]);

  const value = useMemo<LabsUndoContextValue>(() => {
    void stackTick;
    const st = stackRef.current;
    return {
      push,
      withBatch,
      undo: runUndo,
      redo: runRedo,
      clear,
      canUndo: st.canUndo,
      canRedo: st.canRedo,
      isReplayingRef: replayRef,
    };
  }, [push, withBatch, runUndo, runRedo, clear, stackTick]);

  return <LabsUndoContext.Provider value={value}>{children}</LabsUndoContext.Provider>;
}

export function useLabsUndo(): LabsUndoContextValue {
  const v = useContext(LabsUndoContext);
  if (!v) {
    throw new Error('useLabsUndo must be used within LabsUndoProvider');
  }
  return v;
}

export type { LabsUndoCommit };
