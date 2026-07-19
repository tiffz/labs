import { driveGetFileMetadata, driveListFiles } from '../../shared/drive/driveFetch';
import { gestureDb } from '../db/gestureDb';
import type { GesturePack, GestureUnlinkedPackFolder } from '../types';
import {
  ensureGestureReferencePacksLayout,
  listAllGestureReferencePacksRootIds,
} from './gestureDriveLayout';
import {
  indexGesturePackFromDrive,
} from './gesturePackIndex';
import { clearGestureDriveFolderTombstone } from './gestureDriveTombstones';
import { escapeDriveQueryLiteral } from '../../shared/drive/escapeDriveQueryLiteral';

const FOLDER_MIME = 'application/vnd.google-apps.folder';

export type DiscoverUnlinkedReferencePacksOptions = {
  /** Extra folder ids to probe (remote backup envelope, pasted links, etc.). */
  probeFolderIds?: readonly string[];
};

export function dedupeUnlinkedPackFolders(
  folders: readonly GestureUnlinkedPackFolder[],
): GestureUnlinkedPackFolder[] {
  const byId = new Map<string, GestureUnlinkedPackFolder>();
  for (const folder of folders) {
    byId.set(folder.driveFolderId, folder);
  }
  return Array.from(byId.values());
}

export function filterUnlinkedPackFolders(
  folders: readonly GestureUnlinkedPackFolder[],
  packs: readonly GesturePack[],
): GestureUnlinkedPackFolder[] {
  const knownIds = new Set(packs.map((pack) => pack.driveFolderId));
  return dedupeUnlinkedPackFolders(folders).filter((folder) => !knownIds.has(folder.driveFolderId));
}

/** Active Drive folder rows only — excludes trash even when a list query slips one through. */
export function isActiveDriveFolder(meta: { trashed?: boolean; mimeType?: string }): boolean {
  if (meta.trashed === true) return false;
  return (meta.mimeType ?? '').toLowerCase() === FOLDER_MIME;
}

async function listReferencePackChildFolders(
  accessToken: string,
  referencePacksFolderId: string,
): Promise<GestureUnlinkedPackFolder[]> {
  const folders: GestureUnlinkedPackFolder[] = [];
  let pageToken: string | undefined;

  do {
    const list = await driveListFiles(
      accessToken,
      `'${escapeDriveQueryLiteral(referencePacksFolderId)}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`,
      'nextPageToken,files(id,name,trashed)',
      200,
      pageToken,
    );
    for (const file of list.files ?? []) {
      if (!file.id || file.trashed === true) continue;
      folders.push({
        driveFolderId: file.id,
        name: file.name?.trim() || 'Reference pack',
      });
    }
    pageToken = list.nextPageToken;
  } while (pageToken);

  return folders;
}

/** True when folder is a direct child of any Reference Packs root and not in trash. */
export async function probeUnlinkedReferencePackFolder(
  accessToken: string,
  folderId: string,
  referencePacksRootIds: ReadonlySet<string>,
): Promise<GestureUnlinkedPackFolder | null> {
  const trimmed = folderId.trim();
  if (!trimmed) return null;
  try {
    const meta = await driveGetFileMetadata(
      accessToken,
      trimmed,
      'id,name,mimeType,parents,trashed',
    );
    if (!isActiveDriveFolder(meta)) return null;
    const parentId = meta.parents?.[0];
    if (!parentId || !referencePacksRootIds.has(parentId)) return null;
    return {
      driveFolderId: trimmed,
      name: meta.name?.trim() || 'Reference pack',
    };
  } catch {
    return null;
  }
}

function collectProbeFolderIds(options?: DiscoverUnlinkedReferencePacksOptions): string[] {
  const ids = new Set<string>();
  for (const id of options?.probeFolderIds ?? []) {
    const trimmed = id.trim();
    if (trimmed) ids.add(trimmed);
  }
  return Array.from(ids);
}

/** Top-level Reference Packs folders on Drive that are not linked in Dexie. */
export async function discoverUnlinkedReferencePackFolders(
  accessToken: string,
  packs: GesturePack[],
  options?: DiscoverUnlinkedReferencePacksOptions,
): Promise<GestureUnlinkedPackFolder[]> {
  const layout = await ensureGestureReferencePacksLayout(accessToken);
  const rootIds = await listAllGestureReferencePacksRootIds(accessToken, layout.appFolderId);
  const rootIdSet = new Set(rootIds);
  if (rootIdSet.size === 0) {
    rootIdSet.add(layout.referencePacksFolderId);
  }

  const listed = await Promise.all(
    Array.from(rootIdSet).map((rootId) => listReferencePackChildFolders(accessToken, rootId)),
  );

  const probed: GestureUnlinkedPackFolder[] = [];
  for (const folderId of collectProbeFolderIds(options)) {
    const folder = await probeUnlinkedReferencePackFolder(accessToken, folderId, rootIdSet);
    if (folder) probed.push(folder);
  }

  return filterUnlinkedPackFolders([...listed.flat(), ...probed], packs);
}

export type LinkUnlinkedFoldersResult = {
  linkedCount: number;
  photoCount: number;
  names: string[];
};

type PreparedUnlinkedPackLink = {
  folder: GestureUnlinkedPackFolder;
  pack: GesturePack;
};

async function prepareUnlinkedPackLinks(
  folders: GestureUnlinkedPackFolder[],
  now: string,
): Promise<PreparedUnlinkedPackLink[]> {
  const prepared: PreparedUnlinkedPackLink[] = [];
  for (const folder of folders) {
    clearGestureDriveFolderTombstone(folder.driveFolderId);
    const existing = await gestureDb.packs.where('driveFolderId').equals(folder.driveFolderId).first();
    const pack: GesturePack = existing
      ? { ...existing, name: folder.name, lastIndexedAt: now, source: existing.source ?? 'link' }
      : {
          id: crypto.randomUUID(),
          driveFolderId: folder.driveFolderId,
          name: folder.name,
          linkedAt: now,
          lastIndexedAt: now,
          source: 'link',
        };

    prepared.push({ folder, pack });
  }
  return prepared;
}

/** Register manually added Reference Packs folders as local collections. */
export async function linkUnlinkedReferencePackFolders(
  accessToken: string,
  folders: GestureUnlinkedPackFolder[],
): Promise<LinkUnlinkedFoldersResult> {
  if (folders.length === 0) {
    return { linkedCount: 0, photoCount: 0, names: [] };
  }

  const now = new Date().toISOString();
  const prepared = await prepareUnlinkedPackLinks(folders, now);

  await gestureDb.transaction('rw', gestureDb.packs, async () => {
    for (const { pack } of prepared) {
      await gestureDb.packs.put(pack);
    }
  });

  let photoCount = 0;
  for (const { pack } of prepared) {
    photoCount += await indexGesturePackFromDrive(accessToken, pack);
  }

  return {
    linkedCount: prepared.length,
    photoCount,
    names: prepared.map((row) => row.folder.name),
  };
}
