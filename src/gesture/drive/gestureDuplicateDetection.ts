import { driveListFiles } from '../../shared/drive/driveFetch';
import { gestureDb } from '../db/gestureDb';
import type { GesturePack } from '../types';
import { isGestureReferenceImageFile } from './gestureImageFilter';

function escapeDriveQueryString(id: string): string {
  return id.replace(/'/g, "\\'");
}

export type GestureDriveImageRow = {
  id: string;
  name: string;
  createdTime?: string;
  md5Checksum?: string;
  size?: string;
};

export type GestureDuplicateMember = {
  driveFileId: string;
  name: string;
  createdTime?: string;
  inLocalIndex: boolean;
};

export type GestureDuplicateGroup = {
  packId: string;
  packName: string;
  driveFolderId: string;
  /** Stable grouping key (content hash or normalized name). */
  key: string;
  canonicalFileId: string;
  members: GestureDuplicateMember[];
  fileIdsToTrash: string[];
};

export type GestureDuplicateScanResult = {
  groups: GestureDuplicateGroup[];
  duplicateFileCount: number;
  collectionCount: number;
};

/** Grouping key aligned with Encore duplicate detection (md5 when present, else name). */
export function gestureDuplicateGroupKey(file: {
  name: string;
  md5Checksum?: string;
  size?: string;
}): string | null {
  const md5 = file.md5Checksum?.trim();
  if (md5) {
    return `md5:${md5}:${file.size?.trim() ?? ''}`;
  }
  const name = file.name.trim().toLowerCase();
  if (!name) return null;
  return `name:${name}`;
}

function pickCanonicalMember(
  members: GestureDuplicateMember[],
  drawnIds: Set<string>,
): GestureDuplicateMember {
  return [...members].sort((a, b) => {
    const aDrawn = drawnIds.has(a.driveFileId) ? 1 : 0;
    const bDrawn = drawnIds.has(b.driveFileId) ? 1 : 0;
    if (bDrawn !== aDrawn) return bDrawn - aDrawn;
    const aIndexed = a.inLocalIndex ? 1 : 0;
    const bIndexed = b.inLocalIndex ? 1 : 0;
    if (bIndexed !== aIndexed) return bIndexed - aIndexed;
    const ta = a.createdTime ? Date.parse(a.createdTime) : Number.POSITIVE_INFINITY;
    const tb = b.createdTime ? Date.parse(b.createdTime) : Number.POSITIVE_INFINITY;
    return ta - tb;
  })[0]!;
}

export function groupFolderImagesIntoDuplicates(
  pack: GesturePack,
  files: GestureDriveImageRow[],
  indexedIds: Set<string>,
  drawnIds: Set<string>,
): GestureDuplicateGroup[] {
  const byKey = new Map<string, GestureDuplicateMember[]>();

  for (const file of files) {
    const key = gestureDuplicateGroupKey(file);
    if (!key) continue;
    const member: GestureDuplicateMember = {
      driveFileId: file.id,
      name: file.name,
      createdTime: file.createdTime,
      inLocalIndex: indexedIds.has(file.id),
    };
    const list = byKey.get(key) ?? [];
    list.push(member);
    byKey.set(key, list);
  }

  const groups: GestureDuplicateGroup[] = [];
  for (const [key, members] of byKey) {
    if (members.length < 2) continue;
    const canonical = pickCanonicalMember(members, drawnIds);
    const fileIdsToTrash = members
      .filter((member) => member.driveFileId !== canonical.driveFileId)
      .map((member) => member.driveFileId);
    groups.push({
      packId: pack.id,
      packName: pack.name,
      driveFolderId: pack.driveFolderId,
      key,
      canonicalFileId: canonical.driveFileId,
      members,
      fileIdsToTrash,
    });
  }

  return groups.sort((a, b) => a.members[0]?.name.localeCompare(b.members[0]?.name ?? '') ?? 0);
}

function buildContentFingerprintKeysFromDriveFiles(files: GestureDriveImageRow[]): Set<string> {
  const keys = new Set<string>();
  for (const file of files) {
    const key = gestureDuplicateGroupKey(file);
    if (key) keys.add(key);
  }
  return keys;
}

export async function collectPackContentFingerprintKeys(
  accessToken: string,
  folderId: string,
): Promise<Set<string>> {
  const files = await listImagesInFolder(accessToken, folderId);
  return buildContentFingerprintKeysFromDriveFiles(files);
}

async function listImagesInFolder(accessToken: string, folderId: string): Promise<GestureDriveImageRow[]> {
  const rows: GestureDriveImageRow[] = [];
  let pageToken: string | undefined;
  const q = `'${escapeDriveQueryString(folderId)}' in parents and trashed=false`;
  const fields = 'nextPageToken,files(id,name,mimeType,createdTime,size,md5Checksum)';
  do {
    const res = await driveListFiles(accessToken, q, fields, 100, pageToken);
    for (const file of res.files ?? []) {
      if (!file.id || !file.name || !isGestureReferenceImageFile(file)) continue;
      rows.push({
        id: file.id,
        name: file.name,
        createdTime: file.createdTime,
        md5Checksum: file.md5Checksum,
        size: file.size,
      });
    }
    pageToken = res.nextPageToken;
  } while (pageToken);
  return rows;
}

export async function scanGestureCollectionDuplicates(
  accessToken: string,
  packs: GesturePack[],
): Promise<GestureDuplicateScanResult> {
  const groups: GestureDuplicateGroup[] = [];
  const packIdsWithDupes = new Set<string>();

  for (const pack of packs) {
    if (!pack.driveFolderId?.trim()) continue;
    if (pack.uploadStatus === 'uploading') continue;

    const files = await listImagesInFolder(accessToken, pack.driveFolderId);
    const packFiles = await gestureDb.packFiles.where('packId').equals(pack.id).toArray();
    const drawHistory = await gestureDb.drawHistory.where('packId').equals(pack.id).toArray();
    const indexedIds = new Set(packFiles.map((row) => row.driveFileId));
    const drawnIds = new Set(drawHistory.map((row) => row.driveFileId));

    const packGroups = groupFolderImagesIntoDuplicates(pack, files, indexedIds, drawnIds);
    if (packGroups.length > 0) {
      packIdsWithDupes.add(pack.id);
      groups.push(...packGroups);
    }
  }

  const duplicateFileCount = groups.reduce((sum, group) => sum + group.fileIdsToTrash.length, 0);
  return {
    groups,
    duplicateFileCount,
    collectionCount: packIdsWithDupes.size,
  };
}

export function summarizeDuplicateScan(result: GestureDuplicateScanResult): string {
  if (result.duplicateFileCount === 0) {
    return 'No duplicate photos found in your collections.';
  }
  const dup = result.duplicateFileCount;
  const cols = result.collectionCount;
  return `${dup} duplicate photo${dup === 1 ? '' : 's'} in ${cols} collection${cols === 1 ? '' : 's'}.`;
}
