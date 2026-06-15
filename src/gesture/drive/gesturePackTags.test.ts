import { describe, expect, it } from 'vitest';
import {
  collectGestureTagsFromPacks,
  normalizeGestureTag,
  normalizeGestureTags,
  packHasGestureTag,
  packMatchesGestureTagFilters,
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
});
