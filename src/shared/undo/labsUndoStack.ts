export type LabsUndoCommit = {
  undo: () => void | Promise<void>;
  redo: () => void | Promise<void>;
};

export type LabsUndoStackSnapshot = {
  pastLen: number;
  futureLen: number;
};

export type LabsUndoBatchQueue = {
  push: (commit: LabsUndoCommit) => void;
  size: () => number;
};

/**
 * Combine many small commits into a single undo entry.
 *
 * Pass an async function that receives a `queue`; call `queue.push({ undo, redo })`
 * for each individual mutation as it commits. After the function resolves, the
 * collected entries are folded into a single commit on the stack so the user
 * undoes them as one action.
 *
 * Order semantics:
 *  - On undo, individual commits are reversed in *reverse* order (LIFO), so the
 *    last write is undone first. This matches a sequential redo of the original
 *    operations.
 *  - On redo, individual commits are replayed in their original (FIFO) order.
 *
 * If the function throws, partial entries are *not* committed (caller is
 * responsible for any compensating cleanup). If the function pushes zero
 * entries, nothing is added to the stack.
 */
export function combineUndoCommits(commits: LabsUndoCommit[]): LabsUndoCommit | null {
  if (commits.length === 0) return null;
  const items = commits.slice();
  return {
    undo: async () => {
      for (let i = items.length - 1; i >= 0; i--) {
        await items[i]!.undo();
      }
    },
    redo: async () => {
      for (const c of items) {
        await c.redo();
      }
    },
  };
}

const DEFAULT_MAX = 50;

export function createLabsUndoStack(maxDepth = DEFAULT_MAX) {
  let past: LabsUndoCommit[] = [];
  let future: LabsUndoCommit[] = [];

  const snapshot = (): LabsUndoStackSnapshot => ({
    pastLen: past.length,
    futureLen: future.length,
  });

  return {
    snapshot,
    push(commit: LabsUndoCommit) {
      past.push(commit);
      if (past.length > maxDepth) past.shift();
      future = [];
    },
    async undo(): Promise<boolean> {
      const c = past.pop();
      if (!c) return false;
      await c.undo();
      future.push(c);
      return true;
    },
    async redo(): Promise<boolean> {
      const c = future.pop();
      if (!c) return false;
      await c.redo();
      past.push(c);
      return true;
    },
    clear() {
      past = [];
      future = [];
    },
    get canUndo() {
      return past.length > 0;
    },
    get canRedo() {
      return future.length > 0;
    },
  };
}

export type LabsUndoStack = ReturnType<typeof createLabsUndoStack>;
