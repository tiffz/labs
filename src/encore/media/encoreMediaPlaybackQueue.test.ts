import { describe, expect, it } from 'vitest';
import { encoreMediaPlaybackQueueAdvance } from './encoreMediaPlaybackQueue';
import type { EncoreMediaPlaybackTarget } from './encorePlayableMedia';

function target(id: string): EncoreMediaPlaybackTarget {
  return {
    playbackId: id,
    kind: 'drive-audio',
    title: id,
    driveFileId: 'drive-1',
  };
}

describe('encoreMediaPlaybackQueueAdvance', () => {
  it('returns the next queue item', () => {
    const queue = [target('a'), target('b'), target('c')];
    expect(encoreMediaPlaybackQueueAdvance(queue, 0)).toEqual({
      nextIndex: 1,
      nextItem: target('b'),
      exhausted: false,
    });
  });

  it('marks the queue exhausted after the last item', () => {
    const queue = [target('a'), target('b')];
    expect(encoreMediaPlaybackQueueAdvance(queue, 1)).toEqual({
      nextIndex: 1,
      nextItem: null,
      exhausted: true,
    });
  });
});
