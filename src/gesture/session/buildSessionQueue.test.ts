import { describe, expect, it } from 'vitest';
import { buildSessionQueue } from './buildSessionQueue';

describe('buildSessionQueue', () => {
  const files = [
    { driveFileId: 'a', packId: 'p1', name: 'A' },
    { driveFileId: 'b', packId: 'p1', name: 'B' },
    { driveFileId: 'c', packId: 'p2', name: 'C' },
  ];

  it('prioritizes least drawn photos first', () => {
    const drawCounts = new Map([
      ['a', 5],
      ['b', 0],
      ['c', 2],
    ]);
    const queue = buildSessionQueue({
      files,
      drawCounts,
      prioritizeLeastDrawn: true,
      shuffle: false,
    });
    expect(queue.map((f) => f.driveFileId)).toEqual(['b', 'c', 'a']);
  });

  it('treats missing draw history as never drawn', () => {
    const drawCounts = new Map([['a', 3]]);
    const queue = buildSessionQueue({
      files,
      drawCounts,
      prioritizeLeastDrawn: true,
      shuffle: false,
    });
    expect(queue.map((f) => f.driveFileId)).toEqual(['b', 'c', 'a']);
  });

  it('keeps original order when prioritize and shuffle are off', () => {
    const drawCounts = new Map([['a', 1]]);
    const queue = buildSessionQueue({
      files,
      drawCounts,
      prioritizeLeastDrawn: false,
      shuffle: false,
    });
    expect(queue.map((f) => f.driveFileId)).toEqual(['a', 'b', 'c']);
  });

  it('caps queue length when maxPhotos is set', () => {
    const queue = buildSessionQueue({
      files,
      drawCounts: new Map([['a', 2], ['b', 0], ['c', 1]]),
      prioritizeLeastDrawn: true,
      shuffle: false,
      maxPhotos: 2,
    });
    expect(queue.map((f) => f.driveFileId)).toEqual(['b', 'c']);
  });
});
