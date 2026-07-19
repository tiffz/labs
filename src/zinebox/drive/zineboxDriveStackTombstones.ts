import {
  mergePortfolioTombstoneLists,
  normalizePortfolioTombstones,
  portfolioTombstoneIdSet,
  type LabsPortfolioTombstone,
} from '../../shared/drive/labsPortfolioDriveTombstones';

const DELETED_STACKS_KEY = 'zinebox_drive_deleted_stacks_v1';
const MEMBERSHIP_REMOVALS_KEY = 'zinebox_drive_stack_membership_removals_v1';

export const MAX_ZINEBOX_STACK_TOMBSTONES = 500;
export const ZINEBOX_STACK_MEMBERSHIP_KEY_SEP = '::';

export const ZINEBOX_DRIVE_STACK_TOMBSTONES_CHANGED_EVENT = 'zinebox_drive_stack_tombstones_changed';

export type ZineboxStackTombstone = LabsPortfolioTombstone;

interface PersistedShape {
  schemaVersion: 1;
  tombstones: ZineboxStackTombstone[];
}

function emitChanged(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new Event(ZINEBOX_DRIVE_STACK_TOMBSTONES_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

function readPersisted(key: string): ZineboxStackTombstone[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<PersistedShape>;
    if (!Array.isArray(parsed.tombstones)) return [];
    return normalizeStackTombstoneList(parsed.tombstones);
  } catch {
    return [];
  }
}

function writePersisted(key: string, tombstones: ZineboxStackTombstone[]): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistedShape = { schemaVersion: 1, tombstones };
    window.localStorage.setItem(key, JSON.stringify(payload));
    emitChanged();
  } catch {
    /* quota */
  }
}

export function normalizeStackTombstoneList(
  tombstones: readonly ZineboxStackTombstone[],
): ZineboxStackTombstone[] {
  return normalizePortfolioTombstones(tombstones, MAX_ZINEBOX_STACK_TOMBSTONES);
}

export function stackMembershipTombstoneId(stackId: string, comicId: string): string {
  return `${stackId.trim()}${ZINEBOX_STACK_MEMBERSHIP_KEY_SEP}${comicId.trim()}`;
}

export function listZineboxDeletedStackTombstones(): ZineboxStackTombstone[] {
  return readPersisted(DELETED_STACKS_KEY);
}

export function listZineboxStackMembershipRemovalTombstones(): ZineboxStackTombstone[] {
  return readPersisted(MEMBERSHIP_REMOVALS_KEY);
}

export function recordZineboxStackDeletion(stackId: string, removedAt = new Date().toISOString()): void {
  const id = stackId.trim();
  if (!id) return;
  const next = normalizeStackTombstoneList([
    ...readPersisted(DELETED_STACKS_KEY),
    { id, removedAt },
  ]);
  writePersisted(DELETED_STACKS_KEY, next);
}

/** Undo of a stack dissolve/delete — drop the deletion tombstone so the restored stack survives merge. */
export function clearZineboxStackDeletion(stackId: string): void {
  const id = stackId.trim();
  if (!id) return;
  const next = readPersisted(DELETED_STACKS_KEY).filter((t) => t.id !== id);
  writePersisted(DELETED_STACKS_KEY, next);
}

export function recordZineboxStackMembershipRemoval(
  stackId: string,
  comicId: string,
  removedAt = new Date().toISOString(),
): void {
  const id = stackMembershipTombstoneId(stackId, comicId);
  if (!id.includes(ZINEBOX_STACK_MEMBERSHIP_KEY_SEP)) return;
  const next = normalizeStackTombstoneList([
    ...readPersisted(MEMBERSHIP_REMOVALS_KEY),
    { id, removedAt },
  ]);
  writePersisted(MEMBERSHIP_REMOVALS_KEY, next);
}

/** User re-added an issue to a stack — drop the removal tombstone so merge can union again. */
export function clearZineboxStackMembershipRemoval(stackId: string, comicId: string): void {
  const id = stackMembershipTombstoneId(stackId, comicId);
  const next = readPersisted(MEMBERSHIP_REMOVALS_KEY).filter((t) => t.id !== id);
  writePersisted(MEMBERSHIP_REMOVALS_KEY, next);
}

export function mergeZineboxDeletedStackTombstonesFromRemote(
  remote: readonly ZineboxStackTombstone[] | undefined,
): ZineboxStackTombstone[] {
  const merged = mergePortfolioTombstoneLists(
    readPersisted(DELETED_STACKS_KEY),
    remote ?? [],
    MAX_ZINEBOX_STACK_TOMBSTONES,
  );
  writePersisted(DELETED_STACKS_KEY, merged);
  return merged;
}

export function mergeZineboxStackMembershipRemovalTombstonesFromRemote(
  remote: readonly ZineboxStackTombstone[] | undefined,
): ZineboxStackTombstone[] {
  const merged = mergePortfolioTombstoneLists(
    readPersisted(MEMBERSHIP_REMOVALS_KEY),
    remote ?? [],
    MAX_ZINEBOX_STACK_TOMBSTONES,
  );
  writePersisted(MEMBERSHIP_REMOVALS_KEY, merged);
  return merged;
}

export function zineboxDeletedStackIdsFromRemote(
  remoteDeletedStackIds: readonly ZineboxStackTombstone[] | undefined,
): ReadonlySet<string> {
  const merged = mergeZineboxDeletedStackTombstonesFromRemote(remoteDeletedStackIds);
  return portfolioTombstoneIdSet(merged);
}

export function zineboxRemovedStackMembershipIdsFromRemote(
  remoteRemovedStackMemberships: readonly ZineboxStackTombstone[] | undefined,
): ReadonlySet<string> {
  const merged = mergeZineboxStackMembershipRemovalTombstonesFromRemote(remoteRemovedStackMemberships);
  return portfolioTombstoneIdSet(merged);
}

export function zineboxDeletedStackTombstonesForEnvelope(): ZineboxStackTombstone[] {
  return listZineboxDeletedStackTombstones();
}

export function zineboxStackMembershipRemovalTombstonesForEnvelope(): ZineboxStackTombstone[] {
  return listZineboxStackMembershipRemovalTombstones();
}
