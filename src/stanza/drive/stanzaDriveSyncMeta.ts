const STORAGE_KEY = 'labs_stanza_drive_sync_meta_v1';

export interface StanzaDriveSyncMeta {
  lastCloudModifiedTime?: string;
  lastBackupExportedAt?: string;
  /** Drive folder id of `Tiff Zhang Labs / Stanza`. Cached after a successful pull or push so the
   * account menu can deep-link the user to the Stanza folder for debugging. */
  driveAppFolderId?: string;
  /** Drive file id of `progress.json`. Cached for the same reason. */
  driveProgressFileId?: string;
  /** UTC ms timestamp of the most recent successful auto-pull on this device. */
  lastAutoPullAt?: number;
  /** UTC ms timestamp of the most recent successful auto-push on this device. */
  lastAutoPushAt?: number;
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

/** Merge a partial update into the persisted sync meta without clobbering unrelated fields. */
export function patchStanzaDriveSyncMeta(patch: Partial<StanzaDriveSyncMeta>): StanzaDriveSyncMeta {
  const current = readStanzaDriveSyncMeta();
  const next: StanzaDriveSyncMeta = { ...current, ...patch };
  writeStanzaDriveSyncMeta(next);
  return next;
}

/** Prefer the most recent local push time for account-menu "Last backup" copy. */
export function stanzaDriveLastBackupDisplayIso(meta: StanzaDriveSyncMeta): string | undefined {
  const pushAt = meta.lastAutoPushAt;
  const exported = meta.lastBackupExportedAt?.trim();
  if (pushAt != null && pushAt > 0) {
    const exportedMs = exported ? Date.parse(exported) : Number.NaN;
    if (!Number.isFinite(exportedMs) || pushAt > exportedMs) {
      return new Date(pushAt).toISOString();
    }
  }
  return exported || undefined;
}

export { labsDriveFolderUrl as stanzaDriveFolderUrl } from '../../shared/drive/labsDriveFolderUrl';
