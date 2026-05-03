/** Web UI entry points for Google Drive (browser). */

export function driveFolderWebUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`;
}

/** Web UI root (My Drive) when no folder id is available yet. */
export const GOOGLE_DRIVE_WEB_HOME = 'https://drive.google.com/drive/my-drive';

export function driveFileWebUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
}
