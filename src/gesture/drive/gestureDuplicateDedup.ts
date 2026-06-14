import { driveTrashFile } from '../../shared/drive/driveFetch';
import { gestureDb } from '../db/gestureDb';
import { notifyGestureLocalChange } from '../db/gestureChangeBus';
import type { GestureDuplicateGroup } from './gestureDuplicateDetection';

export type ApplyGestureDuplicateDedupResult = {
  trashed: number;
  trashErrors: number;
  packFilesUpdated: number;
  drawHistoryUpdated: number;
};

function buildReplacementMap(groups: readonly GestureDuplicateGroup[]): Map<string, string> {
  const replacements = new Map<string, string>();
  for (const group of groups) {
    for (const trashId of group.fileIdsToTrash) {
      replacements.set(trashId, group.canonicalFileId);
    }
  }
  return replacements;
}

export async function applyGestureDuplicateDedup(
  accessToken: string,
  groups: readonly GestureDuplicateGroup[],
): Promise<ApplyGestureDuplicateDedupResult> {
  const replacements = buildReplacementMap(groups);
  if (replacements.size === 0) {
    return { trashed: 0, trashErrors: 0, packFilesUpdated: 0, drawHistoryUpdated: 0 };
  }

  let packFilesUpdated = 0;
  let drawHistoryUpdated = 0;

  for (const [fromId, toId] of replacements) {
    const packFile = await gestureDb.packFiles.get(fromId);
    if (packFile) {
      await gestureDb.packFiles.delete(fromId);
      const existingTarget = await gestureDb.packFiles.get(toId);
      if (!existingTarget) {
        await gestureDb.packFiles.put({ ...packFile, driveFileId: toId });
      }
      packFilesUpdated += 1;
    }

    const drawRow = await gestureDb.drawHistory.get(fromId);
    if (drawRow) {
      const existingTarget = await gestureDb.drawHistory.get(toId);
      if (existingTarget) {
        await gestureDb.drawHistory.put({
          ...existingTarget,
          firstDrawnAt:
            drawRow.firstDrawnAt < existingTarget.firstDrawnAt
              ? drawRow.firstDrawnAt
              : existingTarget.firstDrawnAt,
          lastDrawnAt:
            drawRow.lastDrawnAt > existingTarget.lastDrawnAt
              ? drawRow.lastDrawnAt
              : existingTarget.lastDrawnAt,
          totalMs: existingTarget.totalMs + drawRow.totalMs,
          sessionCount: existingTarget.sessionCount + drawRow.sessionCount,
        });
        await gestureDb.drawHistory.delete(fromId);
      } else {
        await gestureDb.drawHistory.put({ ...drawRow, driveFileId: toId });
      }
      drawHistoryUpdated += 1;
    }
  }

  let trashed = 0;
  let trashErrors = 0;
  for (const trashId of replacements.keys()) {
    try {
      await driveTrashFile(accessToken, trashId);
      trashed += 1;
    } catch {
      trashErrors += 1;
    }
  }

  notifyGestureLocalChange();
  return { trashed, trashErrors, packFilesUpdated, drawHistoryUpdated };
}
