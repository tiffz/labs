import type { EncorePerformance, EncoreSong } from '../types';
import { effectiveSongAttachments } from '../utils/songAttachments';
import { findEncorePerformanceLinkingDriveFile } from './bulkPerformanceDriveLinks';

/** Normalize a filename for loose matching (attachment labels vs local names). */
export function normalizeImportFileName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

// ——— Bulk score import ———

export type BulkScoreRowLike = {
  id: string;
  source: 'upload' | 'drive';
  driveFileId?: string;
  name: string;
  file?: File;
  guessedSongId: string;
};

export function bulkScoreBatchKey(row: BulkScoreRowLike): string | null {
  if (row.source === 'drive' && row.driveFileId?.trim()) {
    return `drive:${row.driveFileId.trim()}`;
  }
  if (row.source === 'upload' && row.file) {
    return `up:${normalizeImportFileName(row.name)}:${row.file.size}:${row.file.lastModified}`;
  }
  return null;
}

/** Row ids that repeat the same Drive file or same local bytes in this batch (first row per key is kept). */
export function bulkScoreDuplicateIdsInBatch(rows: readonly BulkScoreRowLike[]): Set<string> {
  const seen = new Map<string, string>();
  const dup = new Set<string>();
  for (const r of rows) {
    const k = bulkScoreBatchKey(r);
    if (!k) continue;
    const first = seen.get(k);
    if (first == null) {
      seen.set(k, r.id);
    } else {
      dup.add(r.id);
    }
  }
  return dup;
}

export function bulkScoreLibraryDuplicate(row: BulkScoreRowLike, song: EncoreSong | undefined): boolean {
  if (!song) return false;
  const charts = effectiveSongAttachments(song).filter((a) => a.kind === 'chart');
  if (row.driveFileId?.trim()) {
    const id = row.driveFileId.trim();
    if (charts.some((a) => a.driveFileId === id)) return true;
  }
  if (row.source === 'upload' && row.file) {
    const norm = normalizeImportFileName(row.name);
    if (charts.some((a) => normalizeImportFileName(a.label ?? '') === norm)) return true;
  }
  return false;
}

export function bulkScoreLibraryDuplicateIds(rows: readonly BulkScoreRowLike[], songs: readonly EncoreSong[]): Set<string> {
  const byId = new Map(songs.map((s) => [s.id, s]));
  const out = new Set<string>();
  for (const r of rows) {
    if (!r.guessedSongId) continue;
    if (bulkScoreLibraryDuplicate(r, byId.get(r.guessedSongId))) {
      out.add(r.id);
    }
  }
  return out;
}

export function bulkScoreDuplicateKind(
  rowId: string,
  batchIds: ReadonlySet<string>,
  libraryIds: ReadonlySet<string>,
): 'batch' | 'library' | 'both' | undefined {
  const b = batchIds.has(rowId);
  const l = libraryIds.has(rowId);
  if (!b && !l) return undefined;
  if (b && l) return 'both';
  return b ? 'batch' : 'library';
}

/** Effective skip: explicit skip, or duplicate when user has not forced include (`skipRow === false`). */
export function bulkImportEffectiveSkip(skipRow: boolean | undefined, isDuplicate: boolean): boolean {
  if (skipRow === true) return true;
  if (skipRow === false) return false;
  return isDuplicate;
}

// ——— Bulk performance / video import ———

export type BulkPerfRowLike = {
  id: string;
  driveFileId?: string;
  name: string;
  pendingUploadFile?: File;
  linkedPerformanceId?: string;
};

export function bulkPerfBatchKey(row: BulkPerfRowLike): string | null {
  if (row.driveFileId?.trim()) {
    return `drive:${row.driveFileId.trim()}`;
  }
  if (row.pendingUploadFile) {
    const f = row.pendingUploadFile;
    return `up:${normalizeImportFileName(row.name)}:${f.size}:${f.lastModified}`;
  }
  return null;
}

export function bulkPerfDuplicateIdsInBatch(rows: readonly BulkPerfRowLike[]): Set<string> {
  const seen = new Map<string, string>();
  const dup = new Set<string>();
  for (const r of rows) {
    const k = bulkPerfBatchKey(r);
    if (!k) continue;
    const first = seen.get(k);
    if (first == null) {
      seen.set(k, r.id);
    } else {
      dup.add(r.id);
    }
  }
  return dup;
}

/**
 * Drive file already tied to a performance but this row is not the linked update row
 * (re-scan / re-upload same library video without going through Encore link metadata).
 */
export function bulkPerfLibraryDuplicate(row: BulkPerfRowLike, performances: readonly EncorePerformance[]): boolean {
  if (row.linkedPerformanceId) return false;
  const id = row.driveFileId?.trim();
  if (!id) return false;
  return Boolean(findEncorePerformanceLinkingDriveFile(performances, id));
}

export function bulkPerfLibraryDuplicateIds(
  rows: readonly BulkPerfRowLike[],
  performances: readonly EncorePerformance[],
): Set<string> {
  const out = new Set<string>();
  for (const r of rows) {
    if (bulkPerfLibraryDuplicate(r, performances)) {
      out.add(r.id);
    }
  }
  return out;
}

export function bulkPerfDuplicateKind(
  rowId: string,
  batchIds: ReadonlySet<string>,
  libraryIds: ReadonlySet<string>,
): 'batch' | 'library' | 'both' | undefined {
  return bulkScoreDuplicateKind(rowId, batchIds, libraryIds);
}
