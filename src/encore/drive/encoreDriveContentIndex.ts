import type { DriveFileContentFingerprint } from '../../shared/drive/driveFetch';
import { stripTrailingDuplicateSuffix } from '../import/venueCatalogMatch';
import type { EncoreDriveFileRef } from './encoreDriveFileRefs';
import { contentFingerprintGroupKey } from './driveDuplicateDetection';

export type EncoreDriveContentIndexEntry = {
  driveFileId: string;
  mediaFileId: string;
  name: string;
  /** Human labels for where Encore references this file (for upload reuse prompts). */
  sampleLabels: string[];
};

/** Map from {@link contentFingerprintGroupKey} → canonical Drive file. */
export type EncoreDriveContentIndex = Record<string, EncoreDriveContentIndexEntry>;

/** Weak pre-upload key (no MD5 yet) — same shape as organize name fallback. */
export function fileUploadGroupKey(file: File): string | null {
  const stem = stripTrailingDuplicateSuffix(file.name.replace(/\.[^./\\]+$/i, '').trim()).toLowerCase();
  if (!stem) return null;
  return `name:${stem}:size:${file.size}:mime:${file.type?.trim() ?? ''}`;
}

export function buildEncoreDriveContentIndex(
  refs: readonly EncoreDriveFileRef[],
  fingerprints: Map<string, DriveFileContentFingerprint>,
): EncoreDriveContentIndex {
  const index: EncoreDriveContentIndex = {};

  for (const [rawId, fp] of fingerprints) {
    const key = contentFingerprintGroupKey(fp);
    if (!key) continue;

    const labels: string[] = [];
    for (const ref of refs) {
      const refFp = fingerprints.get(ref.fileId);
      if (!refFp || refFp.mediaFileId !== fp.mediaFileId) continue;
      if (!labels.includes(ref.label)) labels.push(ref.label);
    }
    if (labels.length === 0) {
      labels.push(fp.name || 'Drive file');
    }

    const existing = index[key];
    if (!existing) {
      index[key] = {
        driveFileId: rawId,
        mediaFileId: fp.mediaFileId,
        name: fp.name,
        sampleLabels: labels,
      };
      continue;
    }

    for (const label of labels) {
      if (!existing.sampleLabels.includes(label)) existing.sampleLabels.push(label);
    }
  }

  return index;
}

export function lookupEncoreDriveContentIndex(
  index: EncoreDriveContentIndex | undefined | null,
  file: File,
): EncoreDriveContentIndexEntry | null {
  if (!index) return null;
  const key = fileUploadGroupKey(file);
  if (!key) return null;
  return index[key] ?? null;
}

export function mergeEncoreDriveContentIndex(
  base: EncoreDriveContentIndex | undefined | null,
  patch: EncoreDriveContentIndex,
): EncoreDriveContentIndex {
  return { ...(base ?? {}), ...patch };
}

/** After a successful upload, add one entry to the local index (uses Drive md5 when available). */
export function registerFingerprintInEncoreDriveContentIndex(
  index: EncoreDriveContentIndex,
  fp: DriveFileContentFingerprint,
  label: string,
): EncoreDriveContentIndex {
  const key = contentFingerprintGroupKey(fp);
  if (!key) return index;
  const next = { ...index };
  const existing = next[key];
  const labels = existing?.sampleLabels ?? [];
  if (!labels.includes(label)) labels.push(label);
  next[key] = {
    driveFileId: fp.id,
    mediaFileId: fp.mediaFileId,
    name: fp.name,
    sampleLabels: labels.length > 0 ? labels : [label],
  };
  return next;
}
