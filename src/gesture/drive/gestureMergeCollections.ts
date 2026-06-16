import {
  driveCreateFolder,
  driveGetFileMetadata,
  driveMoveFile,
  driveRenameFile,
} from '../../shared/drive/driveFetch';
import { gestureDb } from '../db/gestureDb';
import { notifyGestureLocalChange } from '../db/gestureChangeBus';
import type { GesturePack } from '../types';
import { sanitizeDriveFolderSegment } from './gestureCollectionPaths';
import { removePackFromAppWithoutTombstones } from './gestureDeleteCollection';
import {
  ensureGestureReferencePacksLayout,
  ensureUniquePackFolderName,
} from './gestureDriveLayout';
import { indexGesturePackFromDrive } from './gesturePackIndex';
import { sanitizePackFolderName } from './gesturePackMetadata';
import { collectGestureTagsFromPacks, normalizeGestureTags } from './gesturePackTags';
import { normalizePackSourceUrl } from './gesturePackSourceUrl';

export type MergeCollectionsProgress =
  | { phase: 'creating-folder' }
  | {
      phase: 'moving-folders';
      packIndex: number;
      packTotal: number;
      packName: string;
    }
  | { phase: 'indexing' }
  | { phase: 'cleaning-up' };

export type MergeCollectionsIntoNewParentInput = {
  sourcePackIds: string[];
  /** Folder name under Reference Packs (sanitized). */
  parentFolderName: string;
  /** When set, replaces auto-merged tags from source packs. */
  tags?: string[];
  /** Resume an interrupted merge into this parent pack. */
  parentPackId?: string;
  onProgress?: (progress: MergeCollectionsProgress) => void;
};

export type MergeCollectionsIntoNewParentResult = {
  newPackId: string;
  folderName: string;
  subfolderNames: string[];
  filesMoved: number;
  sourcePackIds: string[];
};

export function canMergeGesturePacks(packs: GesturePack[]): boolean {
  if (packs.length < 2) return false;
  return packs.every(
    (pack) =>
      pack.driveFolderId?.trim() &&
      pack.uploadStatus !== 'uploading' &&
      pack.mergeStatus !== 'incomplete',
  );
}

export function isPackInvolvedInIncompleteMerge(
  pack: GesturePack,
  incompleteParents: GesturePack[],
): boolean {
  if (pack.mergeStatus === 'incomplete') return true;
  return incompleteParents.some((parent) => parent.mergeSourcePackIds?.includes(pack.id));
}

export function suggestMergedCollectionFolderName(packs: GesturePack[]): string {
  if (packs.length === 0) return 'Merged collection';
  if (packs.length === 1) return sanitizePackFolderName(packs[0].name);
  if (packs.length === 2) {
    return sanitizePackFolderName(`${packs[0].name} + ${packs[1].name}`);
  }
  return sanitizePackFolderName(`${packs[0].name} merged`);
}

export function mergedTagsFromPacks(packs: GesturePack[]): string[] {
  return collectGestureTagsFromPacks(packs);
}

/** First non-empty source URL in pack order (one link stored on the pack). */
export function mergedSourceUrlFromPacks(packs: GesturePack[]): string | undefined {
  for (const pack of packs) {
    const raw = pack.sourceUrl?.trim();
    if (!raw) continue;
    const normalized = normalizePackSourceUrl(raw);
    if (normalized) return normalized;
  }
  return undefined;
}

/** Distinct normalized source URLs across packs (http/https and trailing slash normalized). */
export function uniqueNormalizedSourceUrlsFromPacks(packs: GesturePack[]): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const pack of packs) {
    const raw = pack.sourceUrl?.trim();
    if (!raw) continue;
    const normalized = normalizePackSourceUrl(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    urls.push(normalized);
  }
  return urls;
}

export function mergedSourceUrlsDifferFromPacks(packs: GesturePack[]): boolean {
  return uniqueNormalizedSourceUrlsFromPacks(packs).length > 1;
}

function assignSubfolderName(baseName: string, usedSubfolderNames: Set<string>): string {
  const base = sanitizeDriveFolderSegment(baseName || 'Collection');
  let subfolderName = base;
  if (usedSubfolderNames.has(subfolderName)) {
    let n = 2;
    while (usedSubfolderNames.has(`${subfolderName} (${n})`)) n += 1;
    subfolderName = sanitizeDriveFolderSegment(`${baseName} (${n})`);
  }
  usedSubfolderNames.add(subfolderName);
  return subfolderName;
}

function buildSubfolderMap(packs: GesturePack[]): Record<string, string> {
  const usedSubfolderNames = new Set<string>();
  const map: Record<string, string> = {};
  for (const pack of packs) {
    map[pack.id] = assignSubfolderName(pack.name, usedSubfolderNames);
  }
  return map;
}

function clearedMergeFields(pack: GesturePack): GesturePack {
  const next = { ...pack };
  delete next.mergeStatus;
  delete next.mergeSourcePackIds;
  delete next.mergeCompletedSourcePackIds;
  delete next.mergeSubfolderBySourceId;
  return next;
}

async function persistMergeProgress(parentPack: GesturePack): Promise<void> {
  await gestureDb.packs.put(parentPack);
  notifyGestureLocalChange();
}

/**
 * Move a collection's Drive folder under the merge parent (one Drive operation — same as dragging in Drive).
 * The source folder becomes the subfolder; it is not trashed afterward.
 */
async function moveSourceCollectionFolderOnDrive(
  accessToken: string,
  parentFolderId: string,
  sourcePack: GesturePack,
  subfolderName: string,
): Promise<void> {
  const folderId = sourcePack.driveFolderId?.trim();
  if (!folderId) throw new Error(`“${sourcePack.name}” is not linked to a Drive folder.`);

  const meta = await driveGetFileMetadata(accessToken, folderId, 'id,name,parents,mimeType');
  const parents = meta.parents ?? [];

  if (parents.includes(parentFolderId)) {
    if (meta.name !== subfolderName) {
      await driveRenameFile(accessToken, folderId, subfolderName);
    }
    return;
  }

  if (folderId === parentFolderId) {
    throw new Error('Cannot merge a collection into itself.');
  }

  if (meta.name !== subfolderName) {
    await driveRenameFile(accessToken, folderId, subfolderName);
  }
  await driveMoveFile(accessToken, folderId, parentFolderId, parents);
}

async function transferDrawHistory(fromPackId: string, toPackId: string): Promise<void> {
  const rows = await gestureDb.drawHistory.where('packId').equals(fromPackId).toArray();
  for (const row of rows) {
    await gestureDb.drawHistory.update(row.driveFileId, { packId: toPackId });
  }
}

async function finalizeMergeLocally(
  accessToken: string,
  parentPack: GesturePack,
  sourcePacks: GesturePack[],
  report?: (progress: MergeCollectionsProgress) => void,
): Promise<number> {
  report?.({ phase: 'cleaning-up' });

  for (const sourcePack of sourcePacks) {
    await transferDrawHistory(sourcePack.id, parentPack.id);
    await gestureDb.uploadManifestFiles.where('packId').equals(sourcePack.id).delete();
    await gestureDb.uploadStagingBlobs.where('packId').equals(sourcePack.id).delete();
    await gestureDb.uploadDirectoryHandles.delete(sourcePack.id);
    await removePackFromAppWithoutTombstones(sourcePack.id);
  }

  report?.({ phase: 'indexing' });
  const cleanedParent = clearedMergeFields(parentPack);
  await gestureDb.packs.put(cleanedParent);
  const photoCount = await indexGesturePackFromDrive(accessToken, cleanedParent);
  notifyGestureLocalChange({ immediate: true });
  return photoCount;
}

async function executeMergeJob(
  accessToken: string,
  parentPack: GesturePack,
  sourcePacks: GesturePack[],
  subfolderBySourceId: Record<string, string>,
  report?: (progress: MergeCollectionsProgress) => void,
): Promise<MergeCollectionsIntoNewParentResult> {
  const uniqueIds = sourcePacks.map((pack) => pack.id);
  const completed = new Set(parentPack.mergeCompletedSourcePackIds ?? []);
  const remaining = sourcePacks.filter((pack) => !completed.has(pack.id));

  for (let packIndex = 0; packIndex < remaining.length; packIndex += 1) {
    const sourcePack = remaining[packIndex]!;
    const subfolderName = subfolderBySourceId[sourcePack.id];
    if (!subfolderName) {
      throw new Error(`Missing subfolder plan for “${sourcePack.name}”.`);
    }

    report?.({
      phase: 'moving-folders',
      packIndex: completed.size + packIndex,
      packTotal: sourcePacks.length,
      packName: sourcePack.name,
    });

    await moveSourceCollectionFolderOnDrive(
      accessToken,
      parentPack.driveFolderId,
      sourcePack,
      subfolderName,
    );

    parentPack = {
      ...parentPack,
      mergeCompletedSourcePackIds: [...(parentPack.mergeCompletedSourcePackIds ?? []), sourcePack.id],
    };
    await persistMergeProgress(parentPack);
  }

  const photoCount = await finalizeMergeLocally(accessToken, parentPack, sourcePacks, report);
  const subfolderNames = uniqueIds.map((id) => subfolderBySourceId[id]!).filter(Boolean);

  return {
    newPackId: parentPack.id,
    folderName: parentPack.name,
    subfolderNames,
    filesMoved: photoCount,
    sourcePackIds: uniqueIds,
  };
}

export async function listIncompleteMergePacks(): Promise<GesturePack[]> {
  const packs = await gestureDb.packs.toArray();
  return packs.filter((pack) => pack.mergeStatus === 'incomplete');
}

/** Resume all incomplete merges (safe to call on app load). */
export async function resumeIncompleteMerges(accessToken: string): Promise<string[]> {
  const incomplete = await listIncompleteMergePacks();
  const messages: string[] = [];

  for (const parent of incomplete) {
    try {
      const result = await resumeIncompleteMerge(accessToken, parent.id);
      messages.push(
        `Finished merge for “${result.folderName}” (${result.filesMoved} photo${result.filesMoved === 1 ? '' : 's'}).`,
      );
    } catch (e) {
      messages.push(
        `Merge for “${parent.name}” still incomplete: ${e instanceof Error ? e.message : 'Try Continue merge.'}`,
      );
    }
  }

  return messages;
}

export async function resumeIncompleteMerge(
  accessToken: string,
  parentPackId: string,
  onProgress?: (progress: MergeCollectionsProgress) => void,
): Promise<MergeCollectionsIntoNewParentResult> {
  const parent = await gestureDb.packs.get(parentPackId);
  if (!parent?.mergeStatus || parent.mergeStatus !== 'incomplete') {
    throw new Error('No interrupted merge to resume.');
  }
  const sourceIds = parent.mergeSourcePackIds ?? [];
  if (sourceIds.length < 2) {
    throw new Error('Merge plan is missing source collections.');
  }

  const sourcePacks = (
    await Promise.all(sourceIds.map((id) => gestureDb.packs.get(id)))
  ).filter(Boolean) as GesturePack[];

  const subfolderBySourceId = parent.mergeSubfolderBySourceId ?? buildSubfolderMap(sourcePacks);
  return executeMergeJob(accessToken, parent, sourcePacks, subfolderBySourceId, onProgress);
}

export async function mergeCollectionsIntoNewParent(
  accessToken: string,
  input: MergeCollectionsIntoNewParentInput,
): Promise<MergeCollectionsIntoNewParentResult> {
  if (input.parentPackId) {
    return resumeIncompleteMerge(accessToken, input.parentPackId, input.onProgress);
  }

  const uniqueIds = [...new Set(input.sourcePackIds)];
  if (uniqueIds.length < 2) {
    throw new Error('Pick at least two collections to merge.');
  }

  const sourcePacks = await Promise.all(uniqueIds.map((id) => gestureDb.packs.get(id)));
  if (sourcePacks.some((pack) => !pack)) {
    throw new Error('One or more collections were not found.');
  }
  const packs = sourcePacks as GesturePack[];
  if (!canMergeGesturePacks(packs)) {
    throw new Error('Collections must be linked to Drive and not uploading or mid-merge.');
  }

  const report = input.onProgress;
  const layout = await ensureGestureReferencePacksLayout(accessToken);
  report?.({ phase: 'creating-folder' });

  const folderTitle = sanitizePackFolderName(
    input.parentFolderName.trim() || suggestMergedCollectionFolderName(packs),
  );
  const uniqueFolderName = await ensureUniquePackFolderName(
    accessToken,
    layout.referencePacksFolderId,
    folderTitle,
  );
  const folder = await driveCreateFolder(accessToken, uniqueFolderName, layout.referencePacksFolderId);

  const now = new Date().toISOString();
  const mergedTags =
    input.tags !== undefined ? normalizeGestureTags(input.tags) : mergedTagsFromPacks(packs);
  const mergedSourceUrl = mergedSourceUrlFromPacks(packs);
  const subfolderBySourceId = buildSubfolderMap(packs);

  const newPack: GesturePack = {
    id: crypto.randomUUID(),
    driveFolderId: folder.id,
    name: uniqueFolderName,
    linkedAt: now,
    lastIndexedAt: now,
    source: 'link',
    mergeStatus: 'incomplete',
    mergeSourcePackIds: uniqueIds,
    mergeCompletedSourcePackIds: [],
    mergeSubfolderBySourceId: subfolderBySourceId,
    ...(mergedTags.length > 0 ? { tags: mergedTags } : {}),
    ...(mergedSourceUrl ? { sourceUrl: mergedSourceUrl } : {}),
  };

  await gestureDb.packs.put(newPack);
  notifyGestureLocalChange();

  try {
    return await executeMergeJob(accessToken, newPack, packs, subfolderBySourceId, report);
  } catch (e) {
    notifyGestureLocalChange({ immediate: true });
    throw e;
  }
}

/** Drop an interrupted merge parent from the app (Drive folders unchanged). */
export async function abandonIncompleteMerge(parentPackId: string): Promise<void> {
  const parent = await gestureDb.packs.get(parentPackId);
  if (!parent?.mergeStatus) return;
  await removePackFromAppWithoutTombstones(parentPackId);
  notifyGestureLocalChange({ immediate: true });
}
