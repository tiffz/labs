const STORAGE_KEY = 'labs_zinebox_drive_sync_meta_v1';

export interface ZineboxDriveSyncMeta {
  lastCloudModifiedTime?: string;
  lastBackupExportedAt?: string;
  driveAppFolderId?: string;
}

export function readZineboxDriveSyncMeta(): ZineboxDriveSyncMeta {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ZineboxDriveSyncMeta;
  } catch {
    return {};
  }
}

export function writeZineboxDriveSyncMeta(meta: ZineboxDriveSyncMeta): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
  } catch {
    /* ignore */
  }
}
