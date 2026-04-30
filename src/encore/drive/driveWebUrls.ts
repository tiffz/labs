/** Web UI entry points for Google Drive (browser). */

export function driveFolderWebUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`;
}

export function driveFileWebUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
}

/** Opens Google Drive in the browser (root of “My Drive”). */
export function driveMyDriveWebUrl(): string {
  return 'https://drive.google.com/drive/my-drive';
}
