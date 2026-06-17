import {
  driveCreateFolder,
  driveGetFileMetadata,
  driveListFiles,
} from '../../shared/drive/driveFetch';
import {
  ensureLabsDrivePortfolioProgressLayout,
  LABS_DRIVE_APP_FOLDER_GESTURE,
} from '../../shared/drive/labsDrivePortfolioLayout';
import { GESTURE_REFERENCE_PACKS_FOLDER } from './gestureDriveConstants';
import { readGestureDriveSyncMeta, writeGestureDriveSyncMeta } from './gestureDriveSyncMeta';

function qFolderInParent(name: string, parentId: string): string {
  return `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentId.replace(/'/g, "\\'")}' in parents and trashed=false`;
}

export type GestureReferencePacksLayout = {
  appFolderId: string;
  referencePacksFolderId: string;
};

/** Every `Reference Packs` folder directly under the Gesture app folder (handles duplicates). */
export async function listAllGestureReferencePacksRootIds(
  accessToken: string,
  appFolderId: string,
): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;

  do {
    const list = await driveListFiles(
      accessToken,
      qFolderInParent(GESTURE_REFERENCE_PACKS_FOLDER, appFolderId),
      'nextPageToken,files(id)',
      200,
      pageToken,
    );
    for (const file of list.files ?? []) {
      if (file.id) ids.push(file.id);
    }
    pageToken = list.nextPageToken;
  } while (pageToken);

  const meta = readGestureDriveSyncMeta();
  if (meta.referencePacksFolderId && !ids.includes(meta.referencePacksFolderId)) {
    try {
      const folderMeta = await driveGetFileMetadata(
        accessToken,
        meta.referencePacksFolderId,
        'id,parents',
      );
      if (folderMeta.parents?.includes(appFolderId)) {
        ids.push(meta.referencePacksFolderId);
      }
    } catch {
      /* stale meta id */
    }
  }

  return ids;
}

/** Ensures `Tiff Zhang Labs/Gesture/Reference Packs/` exists (for uploads). */
export async function ensureGestureReferencePacksLayout(
  accessToken: string,
): Promise<GestureReferencePacksLayout> {
  const refs = await ensureLabsDrivePortfolioProgressLayout(accessToken, LABS_DRIVE_APP_FOLDER_GESTURE);
  const rootIds = await listAllGestureReferencePacksRootIds(accessToken, refs.appFolderId);
  const meta = readGestureDriveSyncMeta();

  let referencePacksFolderId: string;
  if (meta.referencePacksFolderId && rootIds.includes(meta.referencePacksFolderId)) {
    referencePacksFolderId = meta.referencePacksFolderId;
  } else if (rootIds.length > 0) {
    referencePacksFolderId = rootIds[0]!;
  } else {
    const created = await driveCreateFolder(accessToken, GESTURE_REFERENCE_PACKS_FOLDER, refs.appFolderId);
    referencePacksFolderId = created.id;
  }

  writeGestureDriveSyncMeta({
    ...readGestureDriveSyncMeta(),
    driveAppFolderId: refs.appFolderId,
    referencePacksFolderId,
  });

  return { appFolderId: refs.appFolderId, referencePacksFolderId };
}

export async function ensureUniquePackFolderName(
  accessToken: string,
  parentId: string,
  desiredName: string,
): Promise<string> {
  const base = desiredName.trim() || 'Reference pack';
  let candidate = base;
  let n = 2;
  while (true) {
    const list = await driveListFiles(accessToken, qFolderInParent(candidate, parentId));
    if (!(list.files?.length ?? 0)) return candidate;
    candidate = `${base} (${n})`;
    n += 1;
    if (n > 50) return `${base} ${Date.now()}`;
  }
}
