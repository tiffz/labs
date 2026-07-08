import { useCallback, useRef } from 'react';
import { useLabsUndo } from '../../shared/undo/LabsUndoContext';
import type { EncoreSong } from '../types';

export type UseEncoreSongDraftUndoArgs = {
  draft: EncoreSong | null;
  setDraft: React.Dispatch<React.SetStateAction<EncoreSong | null>>;
  /** Persist restored snapshots (typically autosave with silentUndo). */
  persist?: (song: EncoreSong) => Promise<void>;
};

/**
 * Push discrete undo steps for draft-first Encore editors (SongPage, Practice media hub).
 * Use for destructive or structural edits (chip delete, reorder) so ⌘Z works immediately.
 */
export function useEncoreSongDraftUndo(args: UseEncoreSongDraftUndoArgs): {
  applySongDraftChange: (mutator: (before: EncoreSong) => EncoreSong) => void;
} {
  const { draft, setDraft, persist } = args;
  const { push: pushUndo, isReplayingRef } = useLabsUndo();
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const applySongDraftChange = useCallback(
    (mutator: (before: EncoreSong) => EncoreSong) => {
      const before = draftRef.current;
      if (!before) return;
      const after = mutator(before);
      if (after === before) return;

      setDraft(after);
      if (isReplayingRef.current) return;

      const snapshotBefore = structuredClone(before);
      const snapshotAfter = structuredClone(after);
      pushUndo({
        undo: async () => {
          setDraft(snapshotBefore);
          await persist?.(snapshotBefore);
        },
        redo: async () => {
          setDraft(snapshotAfter);
          await persist?.(snapshotAfter);
        },
      });
    },
    [isReplayingRef, persist, pushUndo, setDraft],
  );

  return { applySongDraftChange };
}
