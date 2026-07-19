const STORAGE_KEY = 'labs_gesture_drive_sync_meta_v1';

export interface GestureDriveSyncMeta {
  lastCloudModifiedTime?: string;
  lastBackupExportedAt?: string;
  driveAppFolderId?: string;
  /** Canonical Reference Packs folder used for uploads (may differ from siblings on Drive). */
  referencePacksFolderId?: string;
}

export function readGestureDriveSyncMeta(): GestureDriveSyncMeta {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as GestureDriveSyncMeta;
  } catch {
    return {};
  }
}

export function writeGestureDriveSyncMeta(meta: GestureDriveSyncMeta): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
  } catch {
    /* ignore */
  }
}
