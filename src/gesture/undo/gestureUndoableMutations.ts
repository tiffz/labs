import type { LabsUndoCommit } from '../../shared/undo/labsUndoStack';
import { gestureDb } from '../db/gestureDb';
import { notifyGestureLocalChange } from '../db/gestureChangeBus';
import { deleteCollectionFromApp } from '../drive/gestureDeleteCollection';
import {
  clearGestureDriveFileTombstone,
  clearGestureDriveFolderTombstone,
} from '../drive/gestureDriveTombstones';
import { updatePackMetadata } from '../drive/updatePackMetadata';
import type { GesturePack, GesturePackMetadataInput } from '../types';

/**
 * Undo-aware wrappers for Gesture collection CRUD (Tier A undo).
 *
 * Only local-first mutations are undoable. Drive side-effects stay out of the
 * stack per `src/shared/undo/README.md`: "Delete photos on Drive" and folder
 * renames (which rename the Drive folder) do not return commits.
 */

/**
 * App-only collection removal; undo restores the pack, its photo index, and
 * draw history, and clears the Drive tombstones so sync does not re-delete it.
 * Transient upload state (manifest, staging blobs) is not restored.
 */
export async function deleteCollectionFromAppUndoable(
  packId: string,
): Promise<LabsUndoCommit | null> {
  const pack = await gestureDb.packs.get(packId);
  if (!pack) return null;
  const packFiles = await gestureDb.packFiles.where('packId').equals(packId).toArray();
  const drawHistory = await gestureDb.drawHistory.where('packId').equals(packId).toArray();

  await deleteCollectionFromApp(packId);

  return {
    undo: async () => {
      if (pack.driveFolderId?.trim()) {
        clearGestureDriveFolderTombstone(pack.driveFolderId);
      }
      for (const row of packFiles) {
        clearGestureDriveFileTombstone(row.driveFileId);
      }
      await gestureDb.transaction(
        'rw',
        [gestureDb.packs, gestureDb.packFiles, gestureDb.drawHistory],
        async () => {
          await gestureDb.packs.put(pack);
          if (packFiles.length > 0) await gestureDb.packFiles.bulkPut(packFiles);
          if (drawHistory.length > 0) await gestureDb.drawHistory.bulkPut(drawHistory);
        },
      );
      notifyGestureLocalChange({ immediate: true });
    },
    redo: async () => {
      await deleteCollectionFromApp(packId);
    },
  };
}

/**
 * Pack metadata update; undo restores the prior pack row. Returns no commit
 * when the name changes (folder rename is a Drive side-effect — not undoable).
 */
export async function updatePackMetadataUndoable(
  accessToken: string | null | undefined,
  packId: string,
  input: GesturePackMetadataInput,
): Promise<{ updated: GesturePack; commit: LabsUndoCommit | null }> {
  const before = await gestureDb.packs.get(packId);
  const updated = await updatePackMetadata(accessToken, packId, input);
  if (!before || updated.name !== before.name) {
    return { updated, commit: null };
  }
  return {
    updated,
    commit: {
      undo: async () => {
        await gestureDb.packs.put(before);
        notifyGestureLocalChange();
      },
      redo: async () => {
        await gestureDb.packs.put(updated);
        notifyGestureLocalChange();
      },
    },
  };
}
