import {
  GOOGLE_DRIVE_SHORTCUT_MIME,
  type DriveFileContentFingerprint,
  type DriveFileListRow,
} from '../../shared/drive/driveFetch';
import { driveListFiles } from './driveFetch';
import type { EncoreDriveBootstrap } from './bootstrapFolders';
import type { EncoreDriveUploadFolderOverrides } from '../types';

const FOLDER_MIME = 'application/vnd.google-apps.folder';

const INVENTORY_LIST_FIELDS =
  'nextPageToken,files(id,name,mimeType,createdTime,modifiedTime,size,md5Checksum)';

function escapeDriveQueryString(id: string): string {
  return id.replace(/'/g, "\\'");
}

async function driveListAllChildrenInFolder(
  accessToken: string,
  folderId: string,
  pageSize = 100,
): Promise<DriveFileListRow[]> {
  const out: DriveFileListRow[] = [];
  let pageToken: string | undefined;
  const q = `'${escapeDriveQueryString(folderId)}' in parents and trashed=false`;
  do {
    const res = await driveListFiles(accessToken, q, INVENTORY_LIST_FIELDS, pageSize, pageToken);
    out.push(...(res.files ?? []));
    pageToken = res.nextPageToken;
  } while (pageToken);
  return out;
}

export type EncoreDriveInventoryFile = {
  fileId: string;
  name: string;
  parentPathHint?: string;
  listRow: DriveFileListRow;
};

export type DriveCollectEncoreManagedFilesOptions = {
  maxFolders?: number;
  maxListRows?: number;
};

/**
 * Breadth-first walk of Encore-managed upload folders (and optional override folders).
 * Collects every non-folder file so organize-time dedup can find unreferenced duplicates.
 */
export async function driveCollectEncoreManagedFiles(
  accessToken: string,
  rootFolderIds: readonly string[],
  opts: DriveCollectEncoreManagedFilesOptions = {},
): Promise<EncoreDriveInventoryFile[]> {
  const maxFolders = opts.maxFolders ?? 800;
  const maxListRows = opts.maxListRows ?? 80_000;
  const uniqueRoots = [...new Set(rootFolderIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueRoots.length === 0) return [];

  const files: EncoreDriveInventoryFile[] = [];
  const seenFolders = new Set<string>();
  const seenFileIds = new Set<string>();
  type FolderQueueItem = { id: string; pathHint: string };
  const folderQueue: FolderQueueItem[] = uniqueRoots.map((id) => ({ id, pathHint: '' }));
  for (const id of uniqueRoots) seenFolders.add(id);

  let foldersOpened = 0;
  let rowsRead = 0;

  while (folderQueue.length > 0 && foldersOpened < maxFolders && rowsRead < maxListRows) {
    const { id: folderId, pathHint } = folderQueue.shift()!;
    foldersOpened += 1;
    const children = await driveListAllChildrenInFolder(accessToken, folderId);
    rowsRead += children.length;

    for (const row of children) {
      const id = row.id?.trim();
      if (!id) continue;
      const mt = (row.mimeType ?? '').toLowerCase();
      if (mt === FOLDER_MIME) {
        if (!seenFolders.has(id)) {
          seenFolders.add(id);
          const seg = (row.name ?? '').trim();
          const nextPath = seg ? `${pathHint}${seg} / ` : pathHint;
          folderQueue.push({ id, pathHint: nextPath });
        }
        continue;
      }
      if (seenFileIds.has(id)) continue;
      seenFileIds.add(id);
      const name = (row.name ?? '').trim() || 'Untitled';
      files.push({
        fileId: id,
        name,
        parentPathHint: pathHint.trim() || undefined,
        listRow: row,
      });
    }
  }

  return files;
}

/** Folder ids Encore may store uploads in (bootstrap subfolders + user overrides). */
export function collectEncoreManagedUploadFolderIds(
  layout: Pick<EncoreDriveBootstrap, 'performancesFolderId' | 'sheetMusicFolderId' | 'recordingsFolderId'>,
  overrides?: EncoreDriveUploadFolderOverrides | null,
): string[] {
  const ids = new Set<string>();
  const push = (id: string | undefined) => {
    const t = id?.trim();
    if (t) ids.add(t);
  };
  push(layout.performancesFolderId);
  push(layout.sheetMusicFolderId);
  push(layout.recordingsFolderId);
  if (overrides) {
    for (const value of Object.values(overrides)) {
      push(value);
    }
  }
  return [...ids];
}

export function inventoryFileLabel(inv: EncoreDriveInventoryFile): string {
  const path = inv.parentPathHint ? `${inv.parentPathHint} / ` : '';
  return `Drive · ${path}${inv.name}`;
}

/** Build a fingerprint from a list row when Drive returned md5 (skips shortcuts and folders). */
export function fingerprintFromDriveListRow(
  fileId: string,
  row: DriveFileListRow,
): DriveFileContentFingerprint | null {
  const id = fileId.trim();
  if (!id) return null;
  const mt = (row.mimeType ?? '').toLowerCase();
  if (mt === FOLDER_MIME || mt === GOOGLE_DRIVE_SHORTCUT_MIME) return null;
  return {
    id,
    mediaFileId: id,
    name: row.name ?? 'Untitled',
    mimeType: row.mimeType,
    size: row.size,
    md5Checksum: row.md5Checksum,
    createdTime: row.createdTime,
    isShortcutRow: false,
  };
}
