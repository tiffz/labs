import type { LabsUndoCommit } from '../../shared/undo/labsUndoStack';
import { removeComicFromAllStacks } from '../collections/stackMutations';
import { notifyZineboxLocalChange } from '../db/zineboxChangeBus';
import {
  createStackFromComicsUndoable,
  deleteZineboxComicUndoable,
} from '../undo/zineboxUndoableMutations';
import type { ZineboxDuplicateSuggestion, ZineboxStackSuggestion } from './zineboxOrganizeSuggestions';
import type { ZineboxComic } from '../types';

export type ZineboxOrganizeApplyInput = {
  duplicateIdsToApply: ReadonlySet<string>;
  stackIdsToApply: ReadonlySet<string>;
  duplicates: readonly ZineboxDuplicateSuggestion[];
  stackCandidates: readonly ZineboxStackSuggestion[];
  comicsById: ReadonlyMap<string, ZineboxComic>;
  /** Collect per-row undo commits (batch via `useLabsUndo().withBatch`). */
  pushUndoCommit?: (commit: LabsUndoCommit) => void;
};

export type ZineboxOrganizeApplyReport = {
  removedDuplicates: number;
  stacksCreated: number;
};

export async function applyZineboxOrganizeSuggestions(
  input: ZineboxOrganizeApplyInput,
): Promise<ZineboxOrganizeApplyReport> {
  let removedDuplicates = 0;
  let stacksCreated = 0;

  for (const duplicate of input.duplicates) {
    if (!input.duplicateIdsToApply.has(duplicate.id)) continue;
    for (const comicId of duplicate.comicIds) {
      if (comicId === duplicate.keepComicId) continue;
      await removeComicFromAllStacks(comicId);
      const commit = await deleteZineboxComicUndoable(comicId);
      if (commit) input.pushUndoCommit?.(commit);
      removedDuplicates += 1;
    }
  }

  for (const candidate of input.stackCandidates) {
    if (!input.stackIdsToApply.has(candidate.id)) continue;
    const comics = candidate.comicIds
      .map((id) => input.comicsById.get(id))
      .filter((comic): comic is ZineboxComic => comic != null);
    if (comics.length < 2) continue;
    const { commit } = await createStackFromComicsUndoable(
      comics,
      input.comicsById,
      `Stack · ${candidate.label}`,
    );
    input.pushUndoCommit?.(commit);
    stacksCreated += 1;
  }

  if (removedDuplicates > 0 || stacksCreated > 0) {
    notifyZineboxLocalChange({ immediate: true });
  }

  return { removedDuplicates, stacksCreated };
}
