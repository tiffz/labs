export type GesturePackSource = 'link' | 'upload';

/** Set while a local upload is in flight or was interrupted before finishing. */
export type GesturePackUploadStatus = 'uploading' | 'incomplete';

export type GesturePack = {
  id: string;
  driveFolderId: string;
  name: string;
  linkedAt: string;
  lastIndexedAt: string;
  /** How this pack was added. Older rows default to `link`. */
  source?: GesturePackSource;
  /** Present during multi-file Drive uploads; cleared when complete. */
  uploadStatus?: GesturePackUploadStatus;
  expectedFileCount?: number;
  uploadedFileCount?: number;
  /** Local folder name from the original drop/picker (for continue-upload copy). */
  uploadSourceFolderName?: string;
  /** Where you found or downloaded this collection (optional). */
  sourceUrl?: string;
  /** Legacy sync fields — not shown in UI. */
  subject?: string;
  notes?: string;
  tags?: string[];
};

export type GestureUploadPhase = 'scanning' | 'checking' | 'preparing' | 'uploading' | 'finishing';

/** Live upload feedback — shown from the first drop / picker action through completion. */
export type GestureUploadActivity = {
  phase: GestureUploadPhase;
  /** User-visible status line (aria-live). */
  label: string;
  done?: number;
  total?: number;
  collectionName?: string;
};

export type GesturePackMetadataInput = {
  name?: string;
  /** Pass null or empty string to clear. */
  sourceUrl?: string | null;
};

export type CreatePackFromUploadInput = {
  /** When omitted, a dated default folder name is used. */
  name?: string;
  files: File[];
};

export type GesturePackFile = {
  driveFileId: string;
  packId: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
};

export type GestureDrawRecord = {
  driveFileId: string;
  packId: string;
  firstDrawnAt: string;
  lastDrawnAt: string;
  totalMs: number;
  sessionCount: number;
};

export type GestureSyncPayload = {
  packs: GesturePack[];
  drawHistory: GestureDrawRecord[];
};

export type SessionQueueItem = {
  driveFileId: string;
  packId: string;
  name: string;
};

export type SessionConfig = {
  durationSec: number;
  excludePreviouslyDrawn: boolean;
  shuffle: boolean;
  packIds: string[];
};

export type SessionDebrief = {
  photosCompleted: number;
  totalMs: number;
  packIds: string[];
};

export type AppPhase = 'home' | 'session' | 'debrief';

export type GestureHomeTab = 'collections' | 'practice';

export type GestureUploadManifestStatus = 'pending' | 'uploaded';

/** Per-file upload ledger (metadata only, no blobs). Enables skip-on-resume. */
export type GestureUploadManifestFile = {
  id: string;
  packId: string;
  relativePath: string;
  name: string;
  size: number;
  lastModified: number;
  status: GestureUploadManifestStatus;
  driveFileId?: string;
};
