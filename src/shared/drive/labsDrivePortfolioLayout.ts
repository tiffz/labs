/**
 * Portfolio Drive layout for Tiff Zhang Labs micro-apps (separate from Encore's `Encore_App` tree).
 *
 * Requesting `https://www.googleapis.com/auth/drive.file` only (via the app's GIS token request).
 * This app cannot see files created by other apps or the user's personal documents outside what
 * Drive's `drive.file` scope allows — only files the app creates or opens through this flow.
 */
import {
  driveCreateFolder,
  driveCreateJsonFile,
  driveGetFileMetadata,
  driveGetMedia,
  driveListFiles,
  drivePatchJsonMedia,
} from './driveFetch';
import { maybePinDailyDriveFileRevision } from './driveRevisionPinning';

export const LABS_DRIVE_ROOT_FOLDER = 'Tiff Zhang Labs';
export const LABS_DRIVE_APP_FOLDER_SCALES = 'LearnYourScales';
export const LABS_DRIVE_APP_FOLDER_STANZA = 'Stanza';
export const LABS_DRIVE_APP_FOLDER_GESTURE = 'Gesture';
export const LABS_DRIVE_APP_FOLDER_ZINEBOX = 'ZineBox';
export const LABS_DRIVE_APP_FOLDER_LYREFLY = 'Lyrefly';
export const LABS_DRIVE_PROGRESS_FILE = 'progress.json';

function qFolderInParent(name: string, parentId: string): string {
  return `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
}

function qJsonInParent(name: string, parentId: string): string {
  return `name='${name.replace(/'/g, "\\'")}' and mimeType='application/json' and '${parentId}' in parents and trashed=false`;
}

export interface LabsDrivePortfolioProgressRefs {
  rootFolderId: string;
  appFolderId: string;
  progressFileId: string;
}

async function ensureFolderChild(
  accessToken: string,
  name: string,
  parentId: string,
): Promise<string> {
  const list = await driveListFiles(accessToken, qFolderInParent(name, parentId));
  const existingId = (list.files?.[0] as { id?: string } | undefined)?.id;
  if (existingId) return existingId;
  const created = await driveCreateFolder(accessToken, name, parentId);
  return created.id;
}

export async function ensureLabsDrivePortfolioProgressLayout(
  accessToken: string,
  appFolderName: string,
): Promise<LabsDrivePortfolioProgressRefs> {
  const rootList = await driveListFiles(accessToken, qFolderInParent(LABS_DRIVE_ROOT_FOLDER, 'root'));
  const rootFiles = rootList.files ?? [];
  let rootFolderId = (rootFiles[0] as { id?: string } | undefined)?.id;
  if (!rootFolderId) {
    const created = await driveCreateFolder(accessToken, LABS_DRIVE_ROOT_FOLDER, 'root');
    rootFolderId = created.id;
  }

  const appFolderId = await ensureFolderChild(accessToken, appFolderName, rootFolderId);

  const jsonList = await driveListFiles(accessToken, qJsonInParent(LABS_DRIVE_PROGRESS_FILE, appFolderId));
  let progressFileId = (jsonList.files?.[0] as { id?: string } | undefined)?.id;
  if (!progressFileId) {
    const empty = JSON.stringify({
      schemaVersion: 0,
      exportedAt: new Date().toISOString(),
      _placeholder: true,
    });
    const created = await driveCreateJsonFile(accessToken, empty, LABS_DRIVE_PROGRESS_FILE, [appFolderId]);
    progressFileId = created.id;
  }

  return { rootFolderId, appFolderId, progressFileId };
}

export async function readLabsDriveProgressJson(
  accessToken: string,
  progressFileId: string,
): Promise<string> {
  return driveGetMedia(accessToken, progressFileId);
}

/** True when `ensureLabsDrivePortfolioProgressLayout` created an empty stub (not app data yet). */
export function isLabsDrivePortfolioProgressPlaceholder(json: string): boolean {
  try {
    const data = JSON.parse(json) as { schemaVersion?: number; _placeholder?: boolean };
    return data.schemaVersion === 0 || data._placeholder === true;
  } catch {
    return false;
  }
}

export async function writeLabsDriveProgressJson(
  accessToken: string,
  progressFileId: string,
  body: string,
  ifMatch: string | undefined,
): Promise<{ etag?: string; modifiedTime?: string }> {
  const r = await drivePatchJsonMedia(accessToken, progressFileId, body, ifMatch);
  // Best-effort daily keepForever pin so an accidental empty overwrite remains recoverable
  // beyond Drive's unpinned revision prune window.
  void maybePinDailyDriveFileRevision(accessToken, progressFileId);
  return { etag: r.etag, modifiedTime: r.modifiedTime };
}

export async function getLabsDriveProgressFileMeta(
  accessToken: string,
  progressFileId: string,
): Promise<{ modifiedTime?: string; etag?: string }> {
  const meta = await driveGetFileMetadata(accessToken, progressFileId);
  return { modifiedTime: meta.modifiedTime, etag: meta.etag };
}
