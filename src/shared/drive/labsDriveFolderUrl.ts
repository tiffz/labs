/** Stable URL for a Drive app folder when the folder id is known (account menu "Open in Drive"). */
export function labsDriveFolderUrl(folderId: string | undefined | null): string | null {
  if (!folderId?.trim()) return null;
  return `https://drive.google.com/drive/folders/${encodeURIComponent(folderId.trim())}`;
}
