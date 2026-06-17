export type ZineboxReadStatus = 'unread' | 'in_progress' | 'finished';

export type ZineboxStorageKind = 'local' | 'sample';

export type ZineboxComic = {
  id: string;
  title: string;
  source: string;
  fileId: string;
  filename?: string;
  coverThumbnailBase64: string;
  readStatus: ZineboxReadStatus;
  progressPercentage: number;
  /** Local uploads store PDF bytes in IndexedDB; sample seed uses shared fixture PDF. */
  storageKind?: ZineboxStorageKind;
  /** When imported from Google Drive, used to skip duplicates on re-import (may be a shortcut row id). */
  driveFileId?: string;
  /** Resolved media file id after following Drive shortcuts (for dedup). */
  driveMediaFileId?: string;
  /** Drive MD5 checksum when available (content-level dedup across re-imports). */
  contentMd5?: string;
  /** Byte size of the PDF (pairs with filename for local/drive dedup). */
  fileSizeBytes?: number;
  /** PDF in `Tiff Zhang Labs/ZineBox/comics/` (portfolio backup). */
  driveBackupFileId?: string;
  /** Free-text labels for filtering (e.g. Shortbox drop, year, genre). */
  tags?: string[];
};

export type ZineboxComicFile = {
  comicId: string;
  blob: Blob;
};

export type ZineboxCollection = {
  id: string;
  name: string;
  itemIds: string[];
  /** When set, manual order overrides natural sort from filenames. */
  customSortOrder?: string[];
};

export type ZineboxReaderMode = 'single' | 'spread' | 'scroll';

export type ZineboxSpreadOffset = 0 | 1;
