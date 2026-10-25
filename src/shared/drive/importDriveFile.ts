import {
  classifyDriveCopyFailure,
  copyDriveFileToMyDrive,
  isGoogleNativeMimeType,
  type DriveCopyProgress,
} from './copyDriveFileToMyDrive';
import { driveResolveFileForMedia } from './driveFetch';
import { DriveHttpError } from './driveFetchErrors';
import { parseDriveFileIdFromUrlOrId } from './parseDriveFolderUrl';

/**
 * Bring an existing Drive file into an app: point at it if the user owns it, copy it if not.
 *
 * Why the split. A file the user owns stays under their control, so storing its id is enough:
 * nothing is duplicated and nothing about the original changes. A file someone else owns can
 * vanish when they delete it, unshare it, or lose their account, so the only safe way to keep it
 * is a copy the user owns. Before this module the rule lived inline in Encore's performance
 * editor, and every other "paste a Drive link" path stored a pointer at whatever it was given.
 *
 * Two calls, so a caller can show what will happen before doing it:
 *
 *  1. {@link planDriveFileImport} reads metadata only. It never writes to Drive.
 *  2. {@link executeDriveFileImport} copies a foreign file, or returns the owned file's id.
 *
 * A reference makes **no Drive write at all**. Organising shortcuts belong to the app (they depend
 * on its folder layout), so callers create them, as Encore's performance flow does.
 */

/** What Drive says about the file a plan describes (the shortcut target, never the shortcut). */
type DriveFileImportSource = {
  name: string;
  mimeType: string | null;
  /** Absent when Drive did not report it; callers must not read absence as a date. */
  createdTime?: string;
  modifiedTime?: string;
};

export type DriveFileImportPlan =
  /** The user owns the file. Store `fileId`; the original is left exactly as it is. */
  | ({ kind: 'reference'; fileId: string } & DriveFileImportSource)
  /** Someone else owns it, or Drive did not say. Copy before storing anything. */
  | ({ kind: 'copy'; sourceFileId: string } & DriveFileImportSource);

export type DriveFileImportRejection =
  /** The input is not a Drive file link or id. */
  | 'not-a-drive-link'
  /** This account cannot see the file. Drive returns 404 for "exists but not shared with you". */
  | 'not-found'
  | 'folder'
  /** A Google Doc/Sheet/Slide: export-only, no bytes to play or copy. */
  | 'google-native'
  /** A real file the caller does not take (an image offered as a take, say). */
  | 'not-accepted';

export type DriveFileImportPlanResult =
  | { ok: true; plan: DriveFileImportPlan }
  | { ok: false; reason: DriveFileImportRejection };

/** The fields a caller's `accepts` filter can judge by. */
export type DriveFileImportCandidate = {
  name: string;
  mimeType: string | null;
};

const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';

/**
 * Decide reference vs copy from metadata. Never writes.
 *
 * Ownership is read from the shortcut's **target**. A user's own shortcut to a friend's file
 * reports `ownedByMe: true` on the shortcut row, and trusting the row stores a pointer at the
 * friend's file — the exact failure this module exists to prevent.
 *
 * `ownedByMe` missing is treated as foreign. A spare copy of your own file is easy to delete; a
 * pointer at a stranger's file fails silently months later.
 *
 * Throws only for failures that are not about this file (offline, rate limits, expired token), so
 * a transient error is never reported to the user as "you cannot open this link".
 */
export async function planDriveFileImport(
  accessToken: string,
  fileIdOrUrl: string,
  opts?: { accepts?: (candidate: DriveFileImportCandidate) => boolean }
): Promise<DriveFileImportPlanResult> {
  const fileId = parseDriveFileIdFromUrlOrId(fileIdOrUrl);
  if (!fileId) return { ok: false, reason: 'not-a-drive-link' };

  let resolved: Awaited<ReturnType<typeof driveResolveFileForMedia>>;
  try {
    resolved = await driveResolveFileForMedia(accessToken, fileId);
  } catch (error) {
    if (
      error instanceof DriveHttpError &&
      (error.status === 403 || error.status === 404)
    ) {
      return { ok: false, reason: 'not-found' };
    }
    throw error;
  }

  const { meta, mediaFileId } = resolved;
  const mimeType = meta.mimeType?.trim() || null;
  if (mimeType === DRIVE_FOLDER_MIME) return { ok: false, reason: 'folder' };
  if (isGoogleNativeMimeType(mimeType ?? undefined))
    return { ok: false, reason: 'google-native' };

  const name = meta.name?.trim() || 'Untitled';
  if (opts?.accepts && !opts.accepts({ name, mimeType })) {
    return { ok: false, reason: 'not-accepted' };
  }

  const source: DriveFileImportSource = { name, mimeType };
  if (meta.createdTime) source.createdTime = meta.createdTime;
  if (meta.modifiedTime) source.modifiedTime = meta.modifiedTime;
  if (meta.ownedByMe === true) {
    return {
      ok: true,
      plan: { kind: 'reference', fileId: mediaFileId, ...source },
    };
  }
  return {
    ok: true,
    plan: { kind: 'copy', sourceFileId: mediaFileId, ...source },
  };
}

export type DriveFileImportResult = {
  /** The id to store: the user's own file, or the new copy. */
  fileId: string;
  name: string;
  via: 'reference' | 'server-copy' | 'download-upload';
};

/**
 * Carry out a plan. A reference returns at once with no Drive call.
 *
 * A copy needs the source's bytes. Builds whose session token lacks `drive.readonly` are refused
 * with 403/404; `requestReadAccess` is then called once (it may open a consent popup, so callers
 * pass it only from a user gesture) and the copy retried with the token it returns. A second
 * refusal propagates: the user really cannot read the file.
 */
export async function executeDriveFileImport(
  plan: DriveFileImportPlan,
  opts: {
    accessToken: string;
    /** Destination for a copy, in the user's Drive. Unused for a reference. */
    parentFolderId: string;
    /** Name for the copy; defaults to the source's name. */
    copyName?: string;
    requestReadAccess?: () => Promise<string>;
    onProgress?: (progress: DriveCopyProgress) => void;
  }
): Promise<DriveFileImportResult> {
  if (plan.kind === 'reference') {
    return { fileId: plan.fileId, name: plan.name, via: 'reference' };
  }

  const copy = (accessToken: string) =>
    copyDriveFileToMyDrive({
      accessToken,
      sourceFileId: plan.sourceFileId,
      parentFolderId: opts.parentFolderId,
      name: opts.copyName ?? plan.name,
      onProgress: opts.onProgress,
    });

  try {
    const copied = await copy(opts.accessToken);
    return { fileId: copied.fileId, name: copied.name, via: copied.via };
  } catch (error) {
    const reason = classifyDriveCopyFailure(error);
    const permissionDenied = reason === 'no-access' || reason === 'not-found';
    if (!permissionDenied || !opts.requestReadAccess) throw error;
    const broadened = await opts.requestReadAccess();
    const copied = await copy(broadened);
    return { fileId: copied.fileId, name: copied.name, via: copied.via };
  }
}

/** One sentence per rejection, for a field's error text. */
export function describeDriveFileImportRejection(
  reason: DriveFileImportRejection,
  what: string
): string {
  switch (reason) {
    case 'not-a-drive-link':
      return 'Paste a Google Drive file link.';
    case 'not-found':
      return 'This Google account can’t open that file. Check the link, or ask the owner to share it.';
    case 'folder':
      return `That link is a folder. Paste a link to ${what}.`;
    case 'google-native':
      return `That link is a Google Doc, Sheet or Slide, not ${what}.`;
    case 'not-accepted':
      return `That file isn’t ${what}.`;
  }
}
