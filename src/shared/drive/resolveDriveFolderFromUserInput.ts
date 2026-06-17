import { GOOGLE_DRIVE_SHORTCUT_MIME, driveGetFileMetadata } from './driveFetch';
import { parseDriveFolderIdFromUserInput } from './parseDriveFolderUrl';

export const DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

export type ResolveDriveFolderFromUserInputOk = { ok: true; id: string; name: string };
export type ResolveDriveFolderFromUserInputErr = { ok: false; message: string };
export type ResolveDriveFolderFromUserInputResult =
  | ResolveDriveFolderFromUserInputOk
  | ResolveDriveFolderFromUserInputErr;

function isDriveFolderMetadata(meta: {
  mimeType?: string;
  shortcutDetails?: { targetMimeType?: string };
}): boolean {
  if (meta.mimeType === DRIVE_FOLDER_MIME_TYPE) return true;
  return (
    meta.mimeType === GOOGLE_DRIVE_SHORTCUT_MIME &&
    meta.shortcutDetails?.targetMimeType === DRIVE_FOLDER_MIME_TYPE
  );
}

/**
 * Parse pasted text, then confirm via Drive that the id is a folder (not a file).
 * Follows Drive shortcuts when they point at a folder.
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
    let meta = await driveGetFileMetadata(accessToken, id.trim());
    if (
      meta.mimeType === GOOGLE_DRIVE_SHORTCUT_MIME &&
      meta.shortcutDetails?.targetMimeType === DRIVE_FOLDER_MIME_TYPE
    ) {
      const targetId = meta.shortcutDetails.targetId?.trim();
      if (!targetId) {
        return { ok: false, message: 'That folder shortcut has no target. Try the folder link instead.' };
      }
      meta = await driveGetFileMetadata(accessToken, targetId);
    }
    if (!isDriveFolderMetadata(meta)) {
      return { ok: false, message: 'That id is not a folder. Use a folder link or id.' };
    }
    const name = (meta.name ?? '').trim() || meta.id;
    return { ok: true, id: meta.id, name };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}
