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

/**
 * Stable URL for the Stanza app folder in Drive, when we know the folder id.
 * Used by the account menu's "Open in Drive" debug link.
 */
export function stanzaDriveFolderUrl(folderId: string | undefined | null): string | null {
  if (!folderId?.trim()) return null;
  return `https://drive.google.com/drive/folders/${encodeURIComponent(folderId.trim())}`;
}
