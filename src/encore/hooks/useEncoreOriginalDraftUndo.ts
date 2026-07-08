import { useCallback, useRef } from 'react';
import { useLabsUndo } from '../../shared/undo/LabsUndoContext';
import type { EncoreOriginalSong } from '../originals/types';

export type UseEncoreOriginalDraftUndoArgs = {
  draft: EncoreOriginalSong | null;
  setDraft: React.Dispatch<React.SetStateAction<EncoreOriginalSong | null>>;
  /** Persist restored snapshots (typically autosave with silentUndo). */
  persist?: (song: EncoreOriginalSong) => Promise<void>;
};

/**
 * Push discrete undo steps for draft-first Originals editors.
 * Use for structural edits (take delete, resource remove, stage toggle) so ⌘Z works immediately.
 */
export function useEncoreOriginalDraftUndo(args: UseEncoreOriginalDraftUndoArgs): {
  applyOriginalDraftChange: (mutator: (before: EncoreOriginalSong) => EncoreOriginalSong) => void;
} {
  const { draft, setDraft, persist } = args;
  const { push: pushUndo, isReplayingRef } = useLabsUndo();
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const applyOriginalDraftChange = useCallback(
    (mutator: (before: EncoreOriginalSong) => EncoreOriginalSong) => {
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

  return { applyOriginalDraftChange };
}
