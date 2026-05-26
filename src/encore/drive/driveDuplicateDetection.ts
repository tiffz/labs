import type { DriveFileContentFingerprint } from '../../shared/drive/driveFetch';
import { driveGetFileContentFingerprint } from '../../shared/drive/driveFetch';
import { stripTrailingDuplicateSuffix } from '../import/venueCatalogMatch';
import { ensureEncoreDriveLayout } from './bootstrapFolders';
import type { EncoreDriveContentIndex } from './encoreDriveContentIndex';
import { buildEncoreDriveContentIndex } from './encoreDriveContentIndex';
import {
  collectEncoreManagedUploadFolderIds,
  driveCollectEncoreManagedFiles,
  fingerprintFromDriveListRow,
  inventoryFileLabel,
} from './encoreDriveInventory';
import type { EncoreDriveFileRef } from './encoreDriveFileRefs';
import { collectEncoreDriveFileRefs } from './encoreDriveFileRefs';
import { encoreDb } from '../db/encoreDb';
import { defaultRepertoireExtrasRow } from './repertoireWire';
import type { EncorePerformance, EncoreSong } from '../types';
import { ensureOriginalsDriveLayout } from '../originals/drive/originalsSharded';

export type DriveDuplicateMember = {
  fileId: string;
  mediaFileId: string;
  name: string;
  createdTime?: string;
  referenceCount: number;
  /** Up to four refs for compact UI; see {@link DriveDuplicateMember.allRefs}. */
  sampleRefs: EncoreDriveFileRef[];
  /** Every Encore row (or inventory label) that points at this duplicate member. */
  allRefs: EncoreDriveFileRef[];
};

export type DriveDuplicateGroup = {
  /** Stable grouping key (content hash or normalized name). */
  key: string;
  canonicalFileId: string;
  canonicalMediaFileId: string;
  members: DriveDuplicateMember[];
  /** Drive file ids to trash after references are rewritten (non-canonical media + orphan shortcut rows). */
  fileIdsToTrash: string[];
};

/** Stable grouping key for duplicate detection and the upload content index. */
export function contentFingerprintGroupKey(fp: DriveFileContentFingerprint): string | null {
  const md5 = fp.md5Checksum?.trim();
  if (md5) {
    const size = fp.size?.trim() ?? '';
    return `md5:${md5}:size:${size}`;
  }
  const stem = stripTrailingDuplicateSuffix(fp.name.replace(/\.[^./\\]+$/i, '').trim()).toLowerCase();
  if (!stem) return null;
  const size = fp.size?.trim() ?? '';
  const mime = fp.mimeType?.trim() ?? '';
  return `name:${stem}:size:${size}:mime:${mime}`;
}

function pickCanonicalMember(members: DriveDuplicateMember[]): DriveDuplicateMember {
  return [...members].sort((a, b) => {
    const refDelta = b.referenceCount - a.referenceCount;
    if (refDelta !== 0) return refDelta;
    const ta = a.createdTime ? Date.parse(a.createdTime) : Number.POSITIVE_INFINITY;
    const tb = b.createdTime ? Date.parse(b.createdTime) : Number.POSITIVE_INFINITY;
    return ta - tb;
  })[0]!;
}

export function groupFingerprintsIntoDuplicates(
  refs: readonly EncoreDriveFileRef[],
  rawToFingerprint: Map<string, DriveFileContentFingerprint>,
): DriveDuplicateGroup[] {
  const byKey = new Map<string, Map<string, DriveDuplicateMember>>();

  for (const [rawId, fp] of rawToFingerprint) {
    const key = contentFingerprintGroupKey(fp);
    if (!key) continue;
    const mediaId = fp.mediaFileId;
    let group = byKey.get(key);
    if (!group) {
      group = new Map();
      byKey.set(key, group);
    }
    const existing = group.get(mediaId);
    if (existing) {
      if (!existing.fileId.includes(rawId)) {
        /* same media via multiple shortcut rows — keep one member, count refs on raw ids below */
      }
    } else {
      group.set(mediaId, {
        fileId: rawId,
        mediaFileId: mediaId,
        name: fp.name,
        createdTime: fp.createdTime,
        referenceCount: 0,
        sampleRefs: [],
        allRefs: [],
      });
    }
  }

  const groups: DriveDuplicateGroup[] = [];

  for (const [key, mediaMembers] of byKey) {
    if (mediaMembers.size < 2) continue;

    const members = [...mediaMembers.values()];
    for (const member of members) {
      const matched: EncoreDriveFileRef[] = [];
      for (const ref of refs) {
        const fp = rawToFingerprint.get(ref.fileId);
        if (!fp || fp.mediaFileId !== member.mediaFileId) continue;
        matched.push(ref);
      }
      member.referenceCount = matched.length;
      member.allRefs = matched;
      member.sampleRefs = matched.slice(0, 4);
    }

    const canonical = pickCanonicalMember(members);
    const replacementTarget = canonical.mediaFileId;
    const fileIdsToTrash = new Set<string>();

    for (const member of members) {
      if (member.mediaFileId === replacementTarget) continue;
      fileIdsToTrash.add(member.mediaFileId);
    }
    for (const [rawId, fp] of rawToFingerprint) {
      if (fp.mediaFileId === replacementTarget) continue;
      const memberMedia = members.find((m) => m.mediaFileId === fp.mediaFileId);
      if (!memberMedia) continue;
      fileIdsToTrash.add(rawId);
      if (fp.isShortcutRow) fileIdsToTrash.add(rawId);
    }

    groups.push({
      key,
      canonicalFileId: replacementTarget,
      canonicalMediaFileId: replacementTarget,
      members: members.sort((a, b) => b.referenceCount - a.referenceCount),
      fileIdsToTrash: [...fileIdsToTrash],
    });
  }

  return groups.sort((a, b) => b.members.length - a.members.length);
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let index = 0;
  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index;
      index += 1;
      out[i] = await fn(items[i]!);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return out;
}

export async function fetchDriveFileFingerprints(
  accessToken: string,
  fileIds: readonly string[],
): Promise<Map<string, DriveFileContentFingerprint>> {
  const unique = [...new Set(fileIds.map((id) => id.trim()).filter(Boolean))];
  const results = await mapWithConcurrency(unique, 4, async (id) => {
    try {
      return await driveGetFileContentFingerprint(accessToken, id);
    } catch {
      return null;
    }
  });
  const map = new Map<string, DriveFileContentFingerprint>();
  for (let i = 0; i < unique.length; i++) {
    const fp = results[i];
    if (fp) map.set(unique[i]!, fp);
  }
  return map;
}

export type ScanDriveDuplicateUploadsResult = {
  refs: EncoreDriveFileRef[];
  groups: DriveDuplicateGroup[];
  contentIndex: EncoreDriveContentIndex;
};

export async function scanEncoreDriveDuplicateUploads(
  accessToken: string,
  songs?: readonly EncoreSong[],
  performances?: readonly EncorePerformance[],
): Promise<ScanDriveDuplicateUploadsResult> {
  const songRows = songs ?? (await encoreDb.songs.toArray());
  const perfRows = performances ?? (await encoreDb.performances.toArray());
  const libraryRefs = collectEncoreDriveFileRefs(songRows, perfRows);

  const extras =
    (await encoreDb.repertoireExtras.get('default')) ?? defaultRepertoireExtrasRow(new Date().toISOString());
  const layout = await ensureEncoreDriveLayout(accessToken);
  let originalsAudioFolderId: string | undefined;
  try {
    const originalsLayout = await ensureOriginalsDriveLayout(accessToken);
    originalsAudioFolderId = originalsLayout.audioFolderId;
  } catch {
    /* originals layout optional when deduping repertoire-only */
  }

  const folderIds = collectEncoreManagedUploadFolderIds(layout, extras.driveUploadFolderOverrides);
  if (originalsAudioFolderId) folderIds.push(originalsAudioFolderId);

  const inventory = await driveCollectEncoreManagedFiles(accessToken, folderIds);
  const refIds = new Set(libraryRefs.map((r) => r.fileId));
  const inventoryRefs: EncoreDriveFileRef[] = [];
  for (const inv of inventory) {
    if (refIds.has(inv.fileId)) continue;
    inventoryRefs.push({ fileId: inv.fileId, label: inventoryFileLabel(inv) });
    refIds.add(inv.fileId);
  }
  const refs = [...libraryRefs, ...inventoryRefs];

  const rawToFingerprint = new Map<string, DriveFileContentFingerprint>();
  for (const inv of inventory) {
    const fp = fingerprintFromDriveListRow(inv.fileId, inv.listRow);
    if (fp) rawToFingerprint.set(inv.fileId, fp);
  }

  const needFetch = [...refIds].filter((id) => {
    const fp = rawToFingerprint.get(id);
    return !fp?.md5Checksum?.trim();
  });
  const fetched = await fetchDriveFileFingerprints(accessToken, needFetch);
  for (const [id, fp] of fetched) {
    rawToFingerprint.set(id, fp);
  }

  const groups = groupFingerprintsIntoDuplicates(refs, rawToFingerprint);
  const contentIndex = buildEncoreDriveContentIndex(refs, rawToFingerprint);
  return { refs, groups, contentIndex };
}

/** Build a map from any duplicate Drive id (raw or media) to the canonical media file id. */
export function buildDuplicateReplacementMap(groups: readonly DriveDuplicateGroup[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const group of groups) {
    const canonical = group.canonicalMediaFileId;
    map.set(canonical, canonical);
    for (const member of group.members) {
      map.set(member.fileId, canonical);
      map.set(member.mediaFileId, canonical);
    }
    for (const trashId of group.fileIdsToTrash) {
      if (!map.has(trashId)) map.set(trashId, canonical);
    }
  }
  return map;
}
