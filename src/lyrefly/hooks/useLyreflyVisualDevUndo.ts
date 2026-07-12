import { useCallback } from 'react';

import { useLabsUndo } from '../../shared/undo/LabsUndoContext';
import {
  deleteVisualDevAsset,
  restoreVisualDevAsset,
  snapshotVisualDevAssetForUndo,
  updateVisualDevAsset,
} from '../db/lyreflyProjectMutations';
import type { VisualDevAsset } from '../types';

export function useLyreflyVisualDevUndo() {
  const { push } = useLabsUndo();

  const removeAsset = useCallback(
    async (asset: VisualDevAsset): Promise<void> => {
      const snapshot = await snapshotVisualDevAssetForUndo(asset);
      await deleteVisualDevAsset(asset);
      push({
        undo: () => restoreVisualDevAsset(snapshot),
        redo: () => deleteVisualDevAsset(snapshot.asset),
      });
    },
    [push],
  );

  const commitAssetUpdate = useCallback(
    async (before: VisualDevAsset, after: VisualDevAsset): Promise<VisualDevAsset> => {
      const saved = await updateVisualDevAsset(after);
      push({
        undo: async () => {
          await updateVisualDevAsset(before);
        },
        redo: async () => {
          await updateVisualDevAsset(saved);
        },
      });
      return saved;
    },
    [push],
  );

  return { removeAsset, commitAssetUpdate };
}
