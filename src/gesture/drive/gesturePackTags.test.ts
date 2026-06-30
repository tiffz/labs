import { describe, expect, it } from 'vitest';
import {
  collectGestureTagsFromPacks,
  countGestureCollectionsPerTag,
  collectGestureTagAutocompleteOptions,
  countNsfwTaggedCollections,
  collectGestureTagsForFilterBar,
  isGestureNsfwTag,
  normalizeGestureTag,
  normalizeGestureTags,
  packHasGestureTag,
  packHasNsfwTag,
  packMatchesGestureTagFilters,
  packPassesNsfwVisibility,
  packShouldBlurNsfwPreviews,
} from './gesturePackTags';
import type { GesturePack } from '../types';

const basePack = (overrides: Partial<GesturePack> = {}): GesturePack => ({
  id: 'p1',
  driveFolderId: 'folder',
  name: 'Hands',
  linkedAt: '2026-01-01T00:00:00.000Z',
  lastIndexedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('gesturePackTags', () => {
  it('normalizes tags for storage', () => {
    expect(normalizeGestureTag('  Cats  ')).toBe('cats');
    expect(normalizeGestureTag('')).toBeNull();
    expect(normalizeGestureTags(['Cats', 'cats', 'Feet'])).toEqual(['cats', 'feet']);
  });

  it('collects sorted unique tags across packs', () => {
    const tags = collectGestureTagsFromPacks([
      basePack({ tags: ['cats', 'study'] }),
      basePack({ id: 'p2', tags: ['feet', 'Cats'] }),
    ]);
    expect(tags).toEqual(['cats', 'feet', 'study']);
  });

  it('counts collections per tag', () => {
    const counts = countGestureCollectionsPerTag([
      basePack({ id: 'a', tags: ['cats', 'study'] }),
      basePack({ id: 'b', tags: ['feet', 'Cats'] }),
      basePack({ id: 'c', tags: ['cats'] }),
    ]);
    expect(counts.get('cats')).toBe(3);
    expect(counts.get('feet')).toBe(1);
    expect(counts.get('study')).toBe(1);
  });

  it('filters packs with OR semantics', () => {
    const packs = [
      basePack({ id: 'a', tags: ['cats'] }),
      basePack({ id: 'b', tags: ['feet'] }),
      basePack({ id: 'c', tags: ['hands'] }),
    ];
    const active = normalizeGestureTags(['cats', 'feet']);
    const visible = packs.filter((p) => packMatchesGestureTagFilters(p, active));
    expect(visible.map((p) => p.id)).toEqual(['a', 'b']);
    expect(packMatchesGestureTagFilters(packs[2]!, [])).toBe(true);
  });

  it('detects tag membership on a pack', () => {
    const pack = basePack({ tags: ['cats'] });
    expect(packHasGestureTag(pack, 'Cats')).toBe(true);
    expect(packHasGestureTag(pack, 'feet')).toBe(false);
  });

  it('hides NSFW-tagged collections by default', () => {
    const nsfw = basePack({ id: 'n', tags: ['nsfw', 'figure'] });
    const safe = basePack({ id: 's', tags: ['figure'] });
    expect(packHasNsfwTag(nsfw)).toBe(true);
    expect(packPassesNsfwVisibility(nsfw, false)).toBe(false);
    expect(packPassesNsfwVisibility(nsfw, true)).toBe(true);
    expect(packPassesNsfwVisibility(safe, false)).toBe(true);
    expect(packShouldBlurNsfwPreviews(nsfw, false)).toBe(true);
    expect(packShouldBlurNsfwPreviews(nsfw, true)).toBe(false);
    expect(packShouldBlurNsfwPreviews(safe, false)).toBe(false);
    expect(countNsfwTaggedCollections([nsfw, safe])).toBe(1);
  });

  it('excludes nsfw from tag filter chips', () => {
    const tags = collectGestureTagsForFilterBar([
      basePack({ tags: ['cats', 'nsfw'] }),
      basePack({ id: 'p2', tags: ['NSFW'] }),
    ]);
    expect(tags).toEqual(['cats']);
  });

  it('always suggests nsfw in tag autocomplete', () => {
    expect(collectGestureTagAutocompleteOptions(['cats'], [])).toEqual(['nsfw', 'cats']);
    expect(collectGestureTagAutocompleteOptions(['nsfw', 'cats'], ['nsfw'])).toEqual(['cats']);
    expect(isGestureNsfwTag('NSFW')).toBe(true);
  });
});
