/**
 * Practice-tab selection helpers — keep the session queue aligned with what the grid shows.
 */

/** Drop selected ids that are not currently practice-eligible (filtered / NSFW-hidden). */
export function prunePracticeSelectionToAllowed(
  selectedPackIds: readonly string[],
  allowedPackIds: readonly string[],
): string[] {
  if (allowedPackIds.length === 0) return [];
  const allowed = new Set(allowedPackIds);
  return selectedPackIds.filter((id) => allowed.has(id));
}

function sameIdList(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * After a tag-filter change, selection must not keep “ghost” packs outside the filter.
 * - Filters cleared → keep current selection.
 * - Filters active → keep only matching packs; if none remain, select all matches
 *   so Enter Room still has a pool that matches the grid.
 */
export function selectionAfterPracticeTagFilterChange(options: {
  previousSelectedIds: readonly string[];
  nextFilters: readonly string[];
  matchingPracticePackIds: readonly string[];
}): string[] {
  const { previousSelectedIds, nextFilters, matchingPracticePackIds } = options;
  if (nextFilters.length === 0) {
    return [...previousSelectedIds];
  }
  const pruned = prunePracticeSelectionToAllowed(
    previousSelectedIds,
    matchingPracticePackIds,
  );
  if (pruned.length === 0 && matchingPracticePackIds.length > 0) {
    return [...matchingPracticePackIds];
  }
  return pruned;
}

/** Stable prune for React state updaters (returns previous ref when unchanged). */
export function prunePracticeSelectionState(
  previousSelectedIds: string[],
  allowedPackIds: readonly string[],
): string[] {
  const pruned = prunePracticeSelectionToAllowed(previousSelectedIds, allowedPackIds);
  return sameIdList(pruned, previousSelectedIds) ? previousSelectedIds : pruned;
}

/** Pack ids that will actually enter the session queue. */
export function sessionPackIdsFromSelection(
  selectedPackIds: readonly string[],
  allowedPackIds: readonly string[],
): string[] {
  return prunePracticeSelectionToAllowed(selectedPackIds, allowedPackIds);
}

export function formatPracticeSelectionHint(
  visibleSelectedCount: number,
  visibleCount: number,
  totalSelectedCount: number,
): string | null {
  if (visibleCount <= 0) return null;
  const hidden = Math.max(0, totalSelectedCount - visibleSelectedCount);
  if (hidden > 0) {
    return `${visibleSelectedCount} of ${visibleCount} shown · ${hidden} more selected`;
  }
  return `${visibleSelectedCount} of ${visibleCount} selected`;
}
