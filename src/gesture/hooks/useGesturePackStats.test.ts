import { describe, expect, it } from 'vitest';
import { resolveGesturePackCoverFileIds } from './useGesturePackStats';
import type { GesturePack } from '../types';

describe('resolveGesturePackCoverFileIds', () => {
  const pack: GesturePack = {
    id: 'p1',
    driveFolderId: 'f1',
    name: 'Cats',
    linkedAt: '2026-01-01T00:00:00.000Z',
    lastIndexedAt: '2026-01-01T00:00:00.000Z',
    coverFileIds: ['sync-a', 'sync-b'],
  };

  it('prefers synced pack.coverFileIds', () => {
    const coverIds = new Map([['p1', ['live-a', 'live-b']]]);
    expect(resolveGesturePackCoverFileIds(pack, coverIds)).toEqual(['sync-a', 'sync-b']);
  });

  it('falls back to live cover ids when pack has none', () => {
    const coverIds = new Map([['p1', ['live-a', 'live-b']]]);
    expect(resolveGesturePackCoverFileIds({ ...pack, coverFileIds: undefined }, coverIds)).toEqual([
      'live-a',
      'live-b',
    ]);
  });
});
