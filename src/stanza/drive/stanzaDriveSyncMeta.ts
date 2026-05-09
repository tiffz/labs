const STORAGE_KEY = 'labs_stanza_drive_sync_meta_v1';

export interface StanzaDriveSyncMeta {
  lastCloudModifiedTime?: string;
  lastBackupExportedAt?: string;
}

export function readStanzaDriveSyncMeta(): StanzaDriveSyncMeta {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StanzaDriveSyncMeta;
  } catch {
    return {};
  }
}

export function writeStanzaDriveSyncMeta(meta: StanzaDriveSyncMeta): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
  } catch {
    /* ignore */
  }
}
