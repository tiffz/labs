import { driveGetFileMetadata, driveMoveFile, driveTrashFile } from '../../shared/drive/driveFetch';
import { gestureDb } from '../db/gestureDb';
import { notifyGestureLocalChange } from '../db/gestureChangeBus';
import type { GesturePack } from '../types';
import { GestureDriveFolderCache } from './gestureDriveFolderTree';
import { sanitizeDriveFolderSegment, subfolderSegments } from './gestureCollectionPaths';

export type MergeCollectionsInput = {
  targetPackId: string;
  sourcePackId: string;
  /** Subfolder name under the target collection (defaults to source pack name). */
  subfolderName?: string;
};

export type MergeCollectionsResult = {
  targetPackId: string;
  sourcePackId: string;
  subfolderName: string;
  filesMoved: number;
};

export async function mergeGestureCollections(
  accessToken: string,
  input: MergeCollectionsInput,
): Promise<MergeCollectionsResult> {
  const { targetPackId, sourcePackId } = input;
  if (targetPackId === sourcePackId) {
    throw new Error('Pick two different collections to merge.');
  }

  const [target, source] = await Promise.all([
    gestureDb.packs.get(targetPackId),
    gestureDb.packs.get(sourcePackId),
  ]);
  if (!target?.driveFolderId) {
    throw new Error('Target collection is not linked to Drive.');
  }
  if (!source) throw new Error('Source collection not found.');

  const subfolderName = sanitizeDriveFolderSegment(
    input.subfolderName?.trim() || source.name || 'Merged collection',
  );

  const sourceFiles = await gestureDb.packFiles.where('packId').equals(sourcePackId).toArray();
  if (sourceFiles.length === 0 && !source.driveFolderId) {
    throw new Error('Source collection has no photos to merge.');
  }

  const folderCache = new GestureDriveFolderCache(accessToken, target.driveFolderId);
  let filesMoved = 0;

  for (const row of sourceFiles) {
    const newRelativePath = `${subfolderName}/${row.name}`;
    const parentId = await folderCache.resolveParentId(subfolderSegments(newRelativePath));
    const meta = await driveGetFileMetadata(accessToken, row.driveFileId, 'id,parents');
    const parents = meta.parents ?? [];
    await driveMoveFile(accessToken, row.driveFileId, parentId, parents);
    filesMoved += 1;
  }

  await gestureDb.transaction(
    'rw',
    gestureDb.packs,
    gestureDb.packFiles,
    gestureDb.drawHistory,
    gestureDb.uploadManifestFiles,
    async () => {
      for (const row of sourceFiles) {
        const newName = `${subfolderName}/${row.name}`;
        await gestureDb.packFiles.update(row.driveFileId, {
          packId: targetPackId,
          name: newName,
        });
      }
      const drawRows = await gestureDb.drawHistory.where('packId').equals(sourcePackId).toArray();
      for (const draw of drawRows) {
        await gestureDb.drawHistory.update(draw.driveFileId, { packId: targetPackId });
      }
      await gestureDb.uploadManifestFiles.where('packId').equals(sourcePackId).delete();
      await gestureDb.packs.delete(sourcePackId);
    },
  );

  if (source.driveFolderId) {
    try {
      await driveTrashFile(accessToken, source.driveFolderId);
    } catch {
      /* folder may already be empty or trashed */
    }
  }

  notifyGestureLocalChange({ immediate: true });
  return { targetPackId, sourcePackId, subfolderName, filesMoved };
}

export function canMergeGesturePacks(target: GesturePack, source: GesturePack): boolean {
  if (target.id === source.id) return false;
  if (!target.driveFolderId) return false;
  if (source.uploadStatus === 'uploading' || target.uploadStatus === 'uploading') return false;
  return true;
}
