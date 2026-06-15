import { describe, expect, it, beforeEach } from 'vitest';
import {
  getGestureKnownTags,
  registerGestureLocalTags,
  syncGestureTagRegistryFromPacks,
} from './gestureTagRegistry';
import type { GesturePack } from '../types';

const basePack = (overrides: Partial<GesturePack> = {}): GesturePack => ({
  id: 'p1',
  driveFolderId: 'folder',
  name: 'Hands',
  linkedAt: '2026-01-01T00:00:00.000Z',
  lastIndexedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('gestureTagRegistry', () => {
  beforeEach(() => {
    syncGestureTagRegistryFromPacks([]);
  });

  it('tracks pack tags from sync', () => {
    syncGestureTagRegistryFromPacks([basePack({ tags: ['cats', 'feet'] })]);
    expect(getGestureKnownTags()).toEqual(['cats', 'feet']);
  });

  it('includes optimistic local tags before pack sync catches up', () => {
    syncGestureTagRegistryFromPacks([basePack({ tags: ['cats'] })]);
    registerGestureLocalTags(['cats', 'sketches']);
    expect(getGestureKnownTags()).toEqual(['cats', 'sketches']);

    syncGestureTagRegistryFromPacks([basePack({ tags: ['cats'] })]);
    expect(getGestureKnownTags()).toEqual(['cats', 'sketches']);

    syncGestureTagRegistryFromPacks([basePack({ tags: ['cats', 'sketches'] })]);
    expect(getGestureKnownTags()).toEqual(['cats', 'sketches']);
  });
});
