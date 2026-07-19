import type { LabsUndoCommit } from '../../shared/undo/labsUndoStack';
import { gestureDb } from '../db/gestureDb';
import { normalizeGestureTags } from './gesturePackTags';
import { updatePackMetadataUndoable } from '../undo/gestureUndoableMutations';

/** Dexie-only — tags sync via portfolio backup when signed in. */
export async function bulkAddTagsToPacks(
  packIds: string[],
  tagsToAdd: string[],
  pushUndoCommit?: (commit: LabsUndoCommit) => void,
): Promise<number> {
  const normalizedAdd = normalizeGestureTags(tagsToAdd);
  if (normalizedAdd.length === 0) return 0;

  let updated = 0;
  for (const packId of packIds) {
    const pack = await gestureDb.packs.get(packId);
    if (!pack) continue;
    const existing = normalizeGestureTags(pack.tags ?? []);
    const merged = normalizeGestureTags([...existing, ...normalizedAdd]);
    const unchanged =
      merged.length === existing.length && merged.every((tag, index) => tag === existing[index]);
    if (unchanged) continue;
    const { commit } = await updatePackMetadataUndoable(null, packId, { tags: merged });
    if (commit) pushUndoCommit?.(commit);
    updated += 1;
  }
  return updated;
}

/** Dexie-only — source URL syncs via portfolio backup when signed in. */
export async function bulkSetSourceUrlOnPacks(
  packIds: string[],
  sourceUrl: string | null,
  pushUndoCommit?: (commit: LabsUndoCommit) => void,
): Promise<void> {
  for (const packId of packIds) {
    const { commit } = await updatePackMetadataUndoable(null, packId, { sourceUrl });
    if (commit) pushUndoCommit?.(commit);
  }
}
