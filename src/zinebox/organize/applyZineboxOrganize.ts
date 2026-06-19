import { createStackFromComics, removeComicFromAllStacks } from '../collections/stackMutations';
import { deleteZineboxComic } from '../drive/deleteZineboxComic';
import { notifyZineboxLocalChange } from '../db/zineboxChangeBus';
import type { ZineboxDuplicateSuggestion, ZineboxStackSuggestion } from './zineboxOrganizeSuggestions';
import type { ZineboxComic } from '../types';

export type ZineboxOrganizeApplyInput = {
  duplicateIdsToApply: ReadonlySet<string>;
  stackIdsToApply: ReadonlySet<string>;
  duplicates: readonly ZineboxDuplicateSuggestion[];
  stackCandidates: readonly ZineboxStackSuggestion[];
  comicsById: ReadonlyMap<string, ZineboxComic>;
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
      await deleteZineboxComic(comicId);
      removedDuplicates += 1;
    }
  }

  for (const candidate of input.stackCandidates) {
    if (!input.stackIdsToApply.has(candidate.id)) continue;
    const comics = candidate.comicIds
      .map((id) => input.comicsById.get(id))
      .filter((comic): comic is ZineboxComic => comic != null);
    if (comics.length < 2) continue;
    await createStackFromComics(comics, input.comicsById, `Stack · ${candidate.label}`);
    stacksCreated += 1;
  }

  if (removedDuplicates > 0 || stacksCreated > 0) {
    notifyZineboxLocalChange({ immediate: true });
  }

  return { removedDuplicates, stacksCreated };
}
