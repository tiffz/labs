import { describe, expect, it } from 'vitest';

import {
  formatPracticeSelectionHint,
  prunePracticeSelectionToAllowed,
  selectionAfterPracticeTagFilterChange,
  sessionPackIdsFromSelection,
} from './gesturePracticeSelection';

describe('gesturePracticeSelection', () => {
  it('prunes selected packs that are outside the allowed (visible) set', () => {
    expect(prunePracticeSelectionToAllowed(['cats', 'figures', 'hands'], ['cats', 'hands'])).toEqual([
      'cats',
      'hands',
    ]);
  });

  it('clears ghost selections when a tag filter becomes active', () => {
    const next = selectionAfterPracticeTagFilterChange({
      previousSelectedIds: ['cats', 'figures', 'portraits', 'hands'],
      nextFilters: ['cats'],
      matchingPracticePackIds: ['cats', 'cats-2'],
    });
    expect(next).toEqual(['cats']);
  });

  it('selects all matching packs when filter activates on an empty overlap', () => {
    const next = selectionAfterPracticeTagFilterChange({
      previousSelectedIds: ['figures', 'portraits'],
      nextFilters: ['cats'],
      matchingPracticePackIds: ['cats', 'cats-2'],
    });
    expect(next).toEqual(['cats', 'cats-2']);
  });

  it('keeps selection when filters are cleared', () => {
    const next = selectionAfterPracticeTagFilterChange({
      previousSelectedIds: ['cats'],
      nextFilters: [],
      matchingPracticePackIds: ['cats', 'figures', 'portraits'],
    });
    expect(next).toEqual(['cats']);
  });

  it('session pack ids never include hidden selections', () => {
    expect(sessionPackIdsFromSelection(['cats', 'ghost'], ['cats'])).toEqual(['cats']);
  });

  it('selection hint discloses hidden selected packs', () => {
    expect(formatPracticeSelectionHint(3, 3, 12)).toBe('3 of 3 shown · 9 more selected');
    expect(formatPracticeSelectionHint(2, 5, 2)).toBe('2 of 5 selected');
  });
});
