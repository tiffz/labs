import { driveGetFileMetadata } from '../../shared/drive/driveFetch';
import { gestureDb } from '../db/gestureDb';
import { notifyGestureLocalChange } from '../db/gestureChangeBus';
import type { GesturePack } from '../types';
import { removePackFromAppWithoutTombstones } from './gestureDeleteCollection';
import {
  mergedSourceUrlFromPacks,
  mergedTagsFromPacks,
} from './gestureMergeCollections';
import { indexGesturePackFromDrive } from './gesturePackIndex';

const MAX_FOLDER_ANCESTRY_DEPTH = 32;

export type DriveFolderMergeGroup = {
  parentPackId: string;
  parentName: string;
  absorbedPackIds: string[];
  absorbedNames: string[];
  photoCount: number;
};

export type ReconcileDriveFolderMergesResult = {
  groups: DriveFolderMergeGroup[];
  messages: string[];
  errors: string[];
};

type ParentCache = Map<string, string[] | null>;

async function readFolderParents(
  accessToken: string,
  folderId: string,
  cache: ParentCache,
): Promise<string[] | null> {
  const cached = cache.get(folderId);
  if (cached !== undefined) return cached;

  try {
    const meta = await driveGetFileMetadata(accessToken, folderId, 'id,parents');
    const parents = meta.parents ?? [];
    cache.set(folderId, parents);
    return parents;
  } catch {
    cache.set(folderId, null);
    return null;
  }
}

/** True when `folderId` is nested inside `ancestorFolderId` on Google Drive. */
export async function isDriveFolderDescendantOf(
  accessToken: string,
  folderId: string,
  ancestorFolderId: string,
  cache: ParentCache = new Map(),
): Promise<boolean> {
  if (!folderId.trim() || !ancestorFolderId.trim()) return false;
  if (folderId === ancestorFolderId) return false;

  let currentId = folderId;
  for (let depth = 0; depth < MAX_FOLDER_ANCESTRY_DEPTH; depth += 1) {
    const parents = await readFolderParents(accessToken, currentId, cache);
    if (!parents || parents.length === 0) return false;
    if (parents.includes(ancestorFolderId)) return true;
    currentId = parents[0]!;
  }
  return false;
}

/** Nearest registered collection whose Drive folder contains `childFolderId`. */
export async function findRegisteredAncestorPackForFolder(
  accessToken: string,
  childFolderId: string,
  packByFolderId: Map<string, GesturePack>,
  cache: ParentCache = new Map(),
): Promise<GesturePack | null> {
  let currentId = childFolderId;
  for (let depth = 0; depth < MAX_FOLDER_ANCESTRY_DEPTH; depth += 1) {
    const parents = await readFolderParents(accessToken, currentId, cache);
    if (!parents || parents.length === 0) return null;
    for (const parentId of parents) {
      const pack = packByFolderId.get(parentId);
      if (pack) return pack;
    }
    currentId = parents[0]!;
  }
  return null;
}

function resolveRootAbsorber(
  childPackId: string,
  directParentByChild: Map<string, string>,
): string {
  let current = childPackId;
  while (directParentByChild.has(current)) {
    current = directParentByChild.get(current)!;
  }
  return current;
}

function mergePackMetadata(parent: GesturePack, children: GesturePack[]): Partial<GesturePack> {
  const all = [parent, ...children];
  const tags = mergedTagsFromPacks(all);
  const sourceUrl = mergedSourceUrlFromPacks(all);
  return {
    ...(tags.length > 0 ? { tags } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
  };
}

async function transferDrawHistory(fromPackId: string, toPackId: string): Promise<void> {
  const rows = await gestureDb.drawHistory.where('packId').equals(fromPackId).toArray();
  for (const row of rows) {
    await gestureDb.drawHistory.update(row.driveFileId, { packId: toPackId });
  }
}

/**
 * When folders were moved on Google Drive (e.g. collection B dragged into collection A),
 * update Dexie to match: keep the parent collection, drop absorbed children, re-index parent.
 * Does not move files on Drive — only reconciles local state.
 */
export async function reconcileDriveFolderMerges(
  accessToken: string,
): Promise<ReconcileDriveFolderMergesResult> {
  const packs = await gestureDb.packs.toArray();
  const involvedInIncompleteMerge = new Set<string>();
  for (const pack of packs) {
    if (pack.mergeStatus !== 'incomplete') continue;
    involvedInIncompleteMerge.add(pack.id);
    for (const sourceId of pack.mergeSourcePackIds ?? []) {
      involvedInIncompleteMerge.add(sourceId);
    }
  }

  const eligible = packs.filter(
    (pack) =>
      pack.driveFolderId?.trim() &&
      pack.uploadStatus !== 'uploading' &&
      !involvedInIncompleteMerge.has(pack.id),
  );
  const packByFolderId = new Map<string, GesturePack>();
  for (const pack of eligible) {
    packByFolderId.set(pack.driveFolderId, pack);
  }

  const cache: ParentCache = new Map();
  const directParentByChild = new Map<string, string>();

  for (const child of eligible) {
    const ancestor = await findRegisteredAncestorPackForFolder(
      accessToken,
      child.driveFolderId,
      packByFolderId,
      cache,
    );
    if (!ancestor || ancestor.id === child.id) continue;
    directParentByChild.set(child.id, ancestor.id);
  }

  const groupsByRoot = new Map<string, Set<string>>();
  for (const [childId] of directParentByChild) {
    const rootId = resolveRootAbsorber(childId, directParentByChild);
    const bucket = groupsByRoot.get(rootId) ?? new Set<string>();
    bucket.add(childId);
    groupsByRoot.set(rootId, bucket);
  }

  const groups: DriveFolderMergeGroup[] = [];
  const messages: string[] = [];
  const errors: string[] = [];

  for (const [parentPackId, childIds] of groupsByRoot) {
    const parent = await gestureDb.packs.get(parentPackId);
    if (!parent) continue;

    const childPacks: GesturePack[] = [];
    for (const childId of childIds) {
      const child = await gestureDb.packs.get(childId);
      if (child) childPacks.push(child);
    }
    if (childPacks.length === 0) continue;

    try {
      const metadata = mergePackMetadata(parent, childPacks);
      await gestureDb.packs.put({ ...parent, ...metadata });

      for (const child of childPacks) {
        await transferDrawHistory(child.id, parent.id);
        await removePackFromAppWithoutTombstones(child.id);
      }

      const photoCount = await indexGesturePackFromDrive(accessToken, {
        ...parent,
        ...metadata,
      });

      const absorbedNames = childPacks.map((pack) => pack.name);
      groups.push({
        parentPackId: parent.id,
        parentName: parent.name,
        absorbedPackIds: childPacks.map((pack) => pack.id),
        absorbedNames,
        photoCount,
      });

      if (childPacks.length === 1) {
        messages.push(
          `Drive had “${absorbedNames[0]}” inside “${parent.name}” — updated the app to match.`,
        );
      } else {
        messages.push(
          `Drive had ${childPacks.length} collections inside “${parent.name}” — updated the app to match.`,
        );
      }
    } catch (e) {
      errors.push(
        `${parent.name}: ${e instanceof Error ? e.message : 'Could not reconcile Drive folder moves.'}`,
      );
    }
  }

  if (groups.length > 0) {
    notifyGestureLocalChange({ immediate: true });
  }

  return { groups, messages, errors };
}
