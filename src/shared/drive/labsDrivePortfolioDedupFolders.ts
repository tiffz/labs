import { driveListFiles } from './driveFetch';
import { escapeDriveQueryLiteral } from './escapeDriveQueryLiteral';
import {
  LABS_DRIVE_APP_FOLDER_STANZA,
  LABS_DRIVE_ROOT_FOLDER,
} from './labsDrivePortfolioLayout';

const FOLDER_MIME = 'application/vnd.google-apps.folder';

/** Mix-layer bytes folder under `Tiff Zhang Labs/Stanza/` (same name as Stanza app). */
export const LABS_DRIVE_STANZA_STEM_AUDIO_FOLDER = 'stem_audio';

function qFolderInParent(name: string, parentId: string): string {
  return `name='${escapeDriveQueryLiteral(name)}' and mimeType='${FOLDER_MIME}' and '${escapeDriveQueryLiteral(parentId)}' in parents and trashed=false`;
}

async function findFolderChildId(
  accessToken: string,
  name: string,
  parentId: string,
): Promise<string | undefined> {
  const res = await driveListFiles(accessToken, qFolderInParent(name, parentId), 'files(id)', 1);
  return res.files?.[0]?.id?.trim() || undefined;
}

/**
 * Read-only lookup — does not create portfolio folders.
 * Used by Encore upload dedup to index Stanza stem bytes without importing Stanza.
 */
export async function findLabsDriveStanzaStemAudioFolderId(accessToken: string): Promise<string | undefined> {
  try {
    const rootId = await findFolderChildId(accessToken, LABS_DRIVE_ROOT_FOLDER, 'root');
    if (!rootId) return undefined;
    const appId = await findFolderChildId(accessToken, LABS_DRIVE_APP_FOLDER_STANZA, rootId);
    if (!appId) return undefined;
    return findFolderChildId(accessToken, LABS_DRIVE_STANZA_STEM_AUDIO_FOLDER, appId);
  } catch {
    return undefined;
  }
}
