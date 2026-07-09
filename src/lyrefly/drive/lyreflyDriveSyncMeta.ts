const STORAGE_KEY = 'labs_lyrefly_drive_sync_meta_v1';

export interface LyreflyDriveSyncMeta {
  lastCloudModifiedTime?: string;
  lastBackupExportedAt?: string;
  driveAppFolderId?: string;
}

export function readLyreflyDriveSyncMeta(): LyreflyDriveSyncMeta {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as LyreflyDriveSyncMeta;
  } catch {
    return {};
  }
}

export function writeLyreflyDriveSyncMeta(meta: LyreflyDriveSyncMeta): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
  } catch {
    /* ignore */
  }
}
