import { driveGetFileMetadata } from './driveFetch';

const MAX_PARENT_WALK = 32;

/**
 * Walk Drive parents from `fileId` upward. Used to refuse trash/overwrite outside Labs-owned trees
 * (stewardship of user Drive data the app did not create).
 */
export async function driveFileIsUnderAnyAncestor(
  accessToken: string,
  fileId: string,
  ancestorIds: ReadonlySet<string>,
): Promise<boolean> {
  const trimmed = fileId.trim();
  if (!trimmed || ancestorIds.size === 0) return false;
  if (ancestorIds.has(trimmed)) return true;

  let current = trimmed;
  for (let depth = 0; depth < MAX_PARENT_WALK; depth += 1) {
    const meta = await driveGetFileMetadata(accessToken, current, 'id,parents');
    const parentId = meta.parents?.[0]?.trim();
    if (!parentId) return false;
    if (ancestorIds.has(parentId)) return true;
    current = parentId;
  }
  return false;
}

export async function filterDriveFileIdsUnderAncestors(
  accessToken: string,
  fileIds: readonly string[],
  ancestorIds: ReadonlySet<string>,
): Promise<{ allowed: string[]; blocked: string[] }> {
  const allowed: string[] = [];
  const blocked: string[] = [];
  for (const fileId of fileIds) {
    const trimmed = fileId.trim();
    if (!trimmed) continue;
    const ok = await driveFileIsUnderAnyAncestor(accessToken, trimmed, ancestorIds);
    if (ok) allowed.push(trimmed);
    else blocked.push(trimmed);
  }
  return { allowed, blocked };
}
