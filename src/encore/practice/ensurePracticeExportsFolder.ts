import { driveCreateFolder, driveListFiles } from '../drive/driveFetch';
import { ENCORE_PRACTICE_EXPORTS_FOLDER } from '../drive/constants';
import { ensureEncoreDriveLayout } from '../drive/bootstrapFolders';

function qFolderInParent(name: string, parentId: string): string {
  return `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
}

/** `Encore_App/Practice exports/` — creates the folder on first use. */
export async function ensurePracticeExportsFolderId(accessToken: string): Promise<string> {
  const layout = await ensureEncoreDriveLayout(accessToken);
  const list = await driveListFiles(accessToken, qFolderInParent(ENCORE_PRACTICE_EXPORTS_FOLDER, layout.rootFolderId));
  const existing = list.files?.[0]?.id;
  if (existing) return existing;
  const created = await driveCreateFolder(accessToken, ENCORE_PRACTICE_EXPORTS_FOLDER, layout.rootFolderId);
  return created.id;
}
