const STORAGE_KEY = 'labs_scales_drive_sync_meta_v1';

export interface ScalesDriveSyncMeta {
  /** ISO from Drive `modifiedTime` after last successful backup or restore observation. */
  lastCloudModifiedTime?: string;
  /** `exportedAt` from our last successful upload envelope. */
  lastBackupExportedAt?: string;
  /** Drive folder id of `Tiff Zhang Labs / LearnYourScales` (for account menu link). */
  driveAppFolderId?: string;
}

export function readScalesDriveSyncMeta(): ScalesDriveSyncMeta {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ScalesDriveSyncMeta;
  } catch {
    return {};
  }
}

export function writeScalesDriveSyncMeta(meta: ScalesDriveSyncMeta): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
  } catch {
    /* ignore */
  }
}
