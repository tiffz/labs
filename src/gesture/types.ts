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
  /** Stable preview covers (max 4) — set on index, synced via progress.json. */
  coverFileIds?: string[];
  /** Legacy sync fields — not shown in UI. */
  subject?: string;
  notes?: string;
  tags?: string[];
};

export type GestureUploadPhase =
  | 'scanning'
  | 'checking'
  | 'preparing'
  | 'uploading'
  | 'waiting'
  | 'finishing';

/** Live upload feedback — shown from the first drop / picker action through completion. */
export type GestureUploadActivity = {
  phase: GestureUploadPhase;
  /** User-visible status line (aria-live). */
  label: string;
  done?: number;
  total?: number;
  collectionName?: string;
  /** When more folders are waiting in the upload queue. */
  queuedCount?: number;
};

export type GesturePackMetadataInput = {
  name?: string;
  /** Pass null or empty string to clear. */
  sourceUrl?: string | null;
  /** Replace tags; pass an empty array to clear. */
  tags?: string[];
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

export type GestureMediaCacheKind = 'preview' | 'session';

export type GestureMediaCacheRow = {
  id: string;
  driveFileId: string;
  kind: GestureMediaCacheKind;
  blob: Blob;
  width: number;
  mimeType: string;
  fetchedAt: number;
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
  packFiles: GesturePackFile[];
  drawHistory: GestureDrawRecord[];
};

export type SessionQueueItem = {
  driveFileId: string;
  packId: string;
  name: string;
};

export type SessionConfig = {
  durationSec: number;
  /** When true, never-drawn and lightly drawn photos come first. */
  prioritizeLeastDrawn: boolean;
  shuffle: boolean;
  packIds: string[];
  /** Cap queue length; `null` means endless session. */
  maxPhotos: number | null;
  /** Locked at session start so prefetch matches the zen queue. */
  queue?: SessionQueueItem[];
};

export type SessionDebrief = {
  photosCompleted: number;
  photosSkipped: number;
  totalMs: number;
  packIds: string[];
  config: SessionConfig;
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

/** Staged photo bytes for resume-without-re-pick (deleted after each Drive upload). */
export type GestureUploadStagingBlobRow = {
  id: string;
  packId: string;
  relativePath: string;
  blob: Blob;
  mimeType: string;
  byteSize: number;
  lastModified: number;
  savedAt: number;
};

export type GestureUploadDirectoryHandleRow = {
  packId: string;
  folderName: string;
  handle: FileSystemDirectoryHandle;
  savedAt: number;
};
