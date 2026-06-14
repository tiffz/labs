import { describe, expect, it } from 'vitest';
import { buildSessionQueue } from './buildSessionQueue';

describe('buildSessionQueue', () => {
  const files = [
    { driveFileId: 'a', packId: 'p1', name: 'A' },
    { driveFileId: 'b', packId: 'p1', name: 'B' },
    { driveFileId: 'c', packId: 'p2', name: 'C' },
  ];

  it('excludes drawn photos when requested', () => {
    const queue = buildSessionQueue({
      files,
      drawnIds: new Set(['a']),
      excludePreviouslyDrawn: true,
      shuffle: false,
    });
    expect(queue.map((f) => f.driveFileId)).toEqual(['b', 'c']);
  });

  it('keeps all photos when exclude is off', () => {
    const queue = buildSessionQueue({
      files,
      drawnIds: new Set(['a']),
      excludePreviouslyDrawn: false,
      shuffle: false,
    });
    expect(queue).toHaveLength(3);
  });
});
