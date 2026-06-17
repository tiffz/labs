import {
  driveGetFileMetadata,
  driveGetJson,
  driveListFiles,
  GOOGLE_DRIVE_SHORTCUT_MIME,
  type DriveFileListRow,
} from './driveFetch';

const FOLDER_MIME = 'application/vnd.google-apps.folder';

export type DrivePdfImportCandidate = DriveFileListRow & {
  /** Human path under the import root, e.g. `Shortbox / Issue 1 /` */
  parentPathHint?: string;
};

export function isDrivePdfFile(f: {
  name?: string;
  mimeType?: string;
  shortcutDetails?: { targetMimeType?: string };
}): boolean {
  const mt = (f.mimeType ?? '').toLowerCase();
  const n = (f.name ?? '').toLowerCase();
  if (mt === FOLDER_MIME) return false;
  if (mt === GOOGLE_DRIVE_SHORTCUT_MIME) {
    const targetMt = f.shortcutDetails?.targetMimeType?.toLowerCase();
    if (targetMt === 'application/pdf') return true;
    return n.endsWith('.pdf');
  }
  if (mt === 'application/pdf') return true;
  if (mt === 'application/octet-stream' && n.endsWith('.pdf')) return true;
  return n.endsWith('.pdf');
}

/** Stable key for deduping direct PDF rows and shortcuts to the same target file. */
export function drivePdfDedupeKey(f: {
  id?: string;
  shortcutDetails?: { targetId?: string };
}): string | undefined {
  return f.shortcutDetails?.targetId?.trim() || f.id?.trim();
}

function escapeDriveQueryString(id: string): string {
  return id.replace(/'/g, "\\'");
}

async function driveFileNameOnly(accessToken: string, fileId: string): Promise<string> {
  const r = await driveGetJson<{ name?: string }>(accessToken, `/files/${encodeURIComponent(fileId)}`, {
    fields: 'name',
  });
  return r.name?.trim() ?? '';
}

async function driveListAllChildrenInFolder(
  accessToken: string,
  folderId: string,
  driveId: string | undefined,
  pageSize = 1000,
): Promise<DriveFileListRow[]> {
  const out: DriveFileListRow[] = [];
  let pageToken: string | undefined;
  const q = `'${escapeDriveQueryString(folderId)}' in parents and trashed=false`;
  const fields = 'nextPageToken,files(id,name,mimeType,modifiedTime,parents,shortcutDetails,size,md5Checksum)';
  do {
    const res = await driveListFiles(accessToken, q, fields, pageSize, pageToken, driveId);
    out.push(...(res.files ?? []));
    pageToken = res.nextPageToken;
  } while (pageToken);
  return out;
}

export type DriveCollectPdfsOptions = {
  maxFolders?: number;
  maxListRows?: number;
};

export type DriveCollectPdfsResult = {
  files: DrivePdfImportCandidate[];
  /** True when folder or row limits stopped the walk before the queue emptied. */
  truncated: boolean;
  rowsListed: number;
  foldersOpened: number;
};

type FolderQueueItem = { id: string; pathHint: string };

/** Breadth-first walk: collects PDF files in the root folder and nested subfolders. */
export async function driveCollectPdfFilesRecursive(
  accessToken: string,
  rootFolderId: string,
  opts: DriveCollectPdfsOptions = {},
): Promise<DriveCollectPdfsResult> {
  const maxFolders = opts.maxFolders ?? 500;
  const maxListRows = opts.maxListRows ?? 50_000;

  const pdfs: DrivePdfImportCandidate[] = [];
  const seenPdfTargets = new Set<string>();
  let rootLabel = '';
  let sharedDriveId: string | undefined;
  try {
    const rootMeta = await driveGetFileMetadata(accessToken, rootFolderId, 'id,name,driveId,mimeType');
    rootLabel = rootMeta.name?.trim() ?? '';
    sharedDriveId = rootMeta.driveId?.trim() || undefined;
  } catch {
    try {
      rootLabel = await driveFileNameOnly(accessToken, rootFolderId);
    } catch {
      /* non-fatal */
    }
  }
  const rootPrefix = rootLabel ? `${rootLabel} / ` : '';

  const folderQueue: FolderQueueItem[] = [{ id: rootFolderId, pathHint: rootPrefix }];
  const seenFolders = new Set<string>([rootFolderId]);
  let foldersOpened = 0;
  let rowsRead = 0;

  while (folderQueue.length > 0 && foldersOpened < maxFolders && rowsRead < maxListRows) {
    const { id: folderId, pathHint } = folderQueue.shift()!;
    foldersOpened += 1;

    const children = await driveListAllChildrenInFolder(accessToken, folderId, sharedDriveId);
    rowsRead += children.length;

    for (const f of children) {
      const mt = (f.mimeType ?? '').toLowerCase();
      if (mt === FOLDER_MIME) {
        const id = f.id;
        const seg = (f.name ?? '').trim();
        if (id && !seenFolders.has(id)) {
          seenFolders.add(id);
          const nextPath = seg ? `${pathHint}${seg} / ` : pathHint;
          folderQueue.push({ id, pathHint: nextPath });
        }
        continue;
      }
      if (!isDrivePdfFile(f)) continue;
      const dedupeKey = drivePdfDedupeKey(f);
      if (!dedupeKey || seenPdfTargets.has(dedupeKey)) continue;
      seenPdfTargets.add(dedupeKey);
      pdfs.push({
        ...f,
        parentPathHint: pathHint.trim() || undefined,
      });
    }
  }

  const truncated =
    folderQueue.length > 0 || foldersOpened >= maxFolders || rowsRead >= maxListRows;

  return { files: pdfs, truncated, rowsListed: rowsRead, foldersOpened };
}
