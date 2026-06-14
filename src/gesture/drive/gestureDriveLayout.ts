import {
  driveCreateFolder,
  driveListFiles,
} from '../../shared/drive/driveFetch';
import {
  ensureLabsDrivePortfolioProgressLayout,
  LABS_DRIVE_APP_FOLDER_GESTURE,
} from '../../shared/drive/labsDrivePortfolioLayout';
import { GESTURE_REFERENCE_PACKS_FOLDER } from './gestureDriveConstants';

function qFolderInParent(name: string, parentId: string): string {
  return `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentId.replace(/'/g, "\\'")}' in parents and trashed=false`;
}

export type GestureReferencePacksLayout = {
  appFolderId: string;
  referencePacksFolderId: string;
};

/** Ensures `Tiff Zhang Labs/Gesture/Reference Packs/` exists (for uploads). */
export async function ensureGestureReferencePacksLayout(
  accessToken: string,
): Promise<GestureReferencePacksLayout> {
  const refs = await ensureLabsDrivePortfolioProgressLayout(accessToken, LABS_DRIVE_APP_FOLDER_GESTURE);
  const list = await driveListFiles(accessToken, qFolderInParent(GESTURE_REFERENCE_PACKS_FOLDER, refs.appFolderId));
  const existingId = (list.files?.[0] as { id?: string } | undefined)?.id;
  if (existingId) {
    return { appFolderId: refs.appFolderId, referencePacksFolderId: existingId };
  }
  const created = await driveCreateFolder(accessToken, GESTURE_REFERENCE_PACKS_FOLDER, refs.appFolderId);
  return { appFolderId: refs.appFolderId, referencePacksFolderId: created.id };
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
