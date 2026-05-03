import { driveGetFileMetadata } from './driveFetch';
import { parseDriveFolderIdFromUserInput } from './parseDriveFileUrl';

export const DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

export type ResolveDriveFolderFromUserInputOk = { ok: true; id: string; name: string };
export type ResolveDriveFolderFromUserInputErr = { ok: false; message: string };
export type ResolveDriveFolderFromUserInputResult =
  | ResolveDriveFolderFromUserInputOk
  | ResolveDriveFolderFromUserInputErr;

/**
 * Parse pasted text, then confirm via Drive that the id is a folder (not a file).
 * Works without Google Picker; only needs OAuth + Drive metadata scope.
 */
export async function resolveDriveFolderFromUserInput(
  accessToken: string,
  raw: string,
): Promise<ResolveDriveFolderFromUserInputResult> {
  const id = parseDriveFolderIdFromUserInput(raw);
  if (!id?.trim()) {
    return { ok: false, message: 'Paste a valid Google Drive folder URL or id.' };
  }
  try {
    const meta = await driveGetFileMetadata(accessToken, id.trim());
    if (meta.shortcutDetails?.targetId && meta.mimeType === 'application/vnd.google-apps.shortcut') {
      return { ok: false, message: 'Pick the folder itself, not a shortcut to another item.' };
    }
    if (meta.mimeType !== DRIVE_FOLDER_MIME_TYPE) {
      return { ok: false, message: 'That id is not a folder. Use a folder link or id.' };
    }
    const name = (meta.name ?? '').trim() || meta.id;
    return { ok: true, id: meta.id, name };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}
