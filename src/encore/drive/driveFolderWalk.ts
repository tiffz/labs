import { driveGetJson, driveListFiles, type DriveFileListRow } from './driveFetch';

const FOLDER_MIME = 'application/vnd.google-apps.folder';

/** Video file plus hints gathered during folder walk (no extra per-file API calls). */
export type DriveVideoImportCandidate = DriveFileListRow & {
  /** Human path under the import root, e.g. `Shows / Martuni's / ` */
  parentPathHint?: string;
};

/** True when a Drive row should be treated as a performance video for bulk import. */
export function isEncoreBulkImportVideoFile(f: { name?: string; mimeType?: string }): boolean {
  const mt = (f.mimeType ?? '').toLowerCase();
  const n = (f.name ?? '').toLowerCase();
  if (mt === FOLDER_MIME) return false;
  if (mt.startsWith('video/')) return true;
  return /\.(mp4|mov|m4v|webm|mkv|mpeg|mpg|avi)$/i.test(n);
}

/** True when a Drive row should be treated as a chart / score for bulk import. */
export function isEncoreBulkImportScoreFile(f: { name?: string; mimeType?: string }): boolean {
  const mt = (f.mimeType ?? '').toLowerCase();
  const n = (f.name ?? '').toLowerCase();
  if (mt === FOLDER_MIME) return false;
  if (mt === 'application/pdf') return true;
  if (mt === 'application/vnd.recordare.musicxml+xml') return true;
  if (mt === 'application/vnd.recordare.musicxml') return true;
  if (mt === 'audio/midi' || mt === 'audio/x-midi') return true;
  return /\.(pdf|musicxml|mxl|mid|midi|xml)$/i.test(n);
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

/** Lists every child in one folder, following Drive `nextPageToken` (not limited to the first page). */
async function driveListAllChildrenInFolder(
  accessToken: string,
  folderId: string,
  pageSize = 100,
): Promise<DriveFileListRow[]> {
  const out: DriveFileListRow[] = [];
  let pageToken: string | undefined;
  const q = `'${escapeDriveQueryString(folderId)}' in parents and trashed=false`;
  const fields =
    'nextPageToken,files(id,name,mimeType,createdTime,modifiedTime,parents,description,contentHints)';
  do {
    const res = await driveListFiles(accessToken, q, fields, pageSize, pageToken);
    out.push(...(res.files ?? []));
    pageToken = res.nextPageToken;
  } while (pageToken);
  return out;
}

export type DriveCollectVideosOptions = {
  /** Max folders to open (breadth × depth guard). */
  maxFolders?: number;
  /** Max total rows returned from `files.list` across all pages and folders. */
  maxListRows?: number;
};

type FolderQueueItem = { id: string; pathHint: string };

/**
 * Breadth-first walk from `rootFolderId`: collects video-like files in the root and all nested folders.
 * Attaches **parentPathHint** (folder breadcrumb) for smarter name matching. One optional `files.get` for the root
 * display name. Requires OAuth scope that can list the user’s Drive metadata (e.g. `drive.metadata.readonly`).
 */
export async function driveCollectVideoFilesRecursive(
  accessToken: string,
  rootFolderId: string,
  opts: DriveCollectVideosOptions = {},
): Promise<DriveVideoImportCandidate[]> {
  const maxFolders = opts.maxFolders ?? 500;
  const maxListRows = opts.maxListRows ?? 50_000;

  const videos: DriveVideoImportCandidate[] = [];
  let rootLabel = '';
  try {
    rootLabel = await driveFileNameOnly(accessToken, rootFolderId);
  } catch {
    /* non-fatal: path hints still work for nested folders */
  }
  const rootPrefix = rootLabel ? `${rootLabel} / ` : '';

  const folderQueue: FolderQueueItem[] = [{ id: rootFolderId, pathHint: rootPrefix }];
  const seenFolders = new Set<string>([rootFolderId]);
  let foldersOpened = 0;
  let rowsRead = 0;

  while (folderQueue.length > 0 && foldersOpened < maxFolders && rowsRead < maxListRows) {
    const { id: folderId, pathHint } = folderQueue.shift()!;
    foldersOpened += 1;

    const children = await driveListAllChildrenInFolder(accessToken, folderId);
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
      if (isEncoreBulkImportVideoFile(f)) {
        videos.push({
          ...f,
          parentPathHint: pathHint.trim() || undefined,
        });
      }
    }
  }

  return videos;
}

/** Same as `driveCollectVideoFilesRecursive` but for chart / score files. */
export async function driveCollectScoreFilesRecursive(
  accessToken: string,
  rootFolderId: string,
  opts: DriveCollectVideosOptions = {},
): Promise<DriveVideoImportCandidate[]> {
  const maxFolders = opts.maxFolders ?? 500;
  const maxListRows = opts.maxListRows ?? 50_000;

  const scores: DriveVideoImportCandidate[] = [];
  let rootLabel = '';
  try {
    rootLabel = await driveFileNameOnly(accessToken, rootFolderId);
  } catch {
    /* non-fatal: path hints still work for nested folders */
  }
  const rootPrefix = rootLabel ? `${rootLabel} / ` : '';

  const folderQueue: FolderQueueItem[] = [{ id: rootFolderId, pathHint: rootPrefix }];
  const seenFolders = new Set<string>([rootFolderId]);
  let foldersOpened = 0;
  let rowsRead = 0;

  while (folderQueue.length > 0 && foldersOpened < maxFolders && rowsRead < maxListRows) {
    const { id: folderId, pathHint } = folderQueue.shift()!;
    foldersOpened += 1;

    const children = await driveListAllChildrenInFolder(accessToken, folderId);
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
      if (isEncoreBulkImportScoreFile(f)) {
        scores.push({
          ...f,
          parentPathHint: pathHint.trim() || undefined,
        });
      }
    }
  }

  return scores;
}
