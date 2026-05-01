import { describe, expect, it } from 'vitest';
import { orderSnapshotSongsByLatestPerformanceDesc } from './publicSnapshotSort';

describe('orderSnapshotSongsByLatestPerformanceDesc', () => {
  it('orders by latest performance date descending', () => {
    const songs = [
      { id: 'a', title: 'Older', artist: 'X' },
      { id: 'b', title: 'Newer', artist: 'Y' },
      { id: 'c', title: 'No perf', artist: 'Z' },
    ];
    const performances = [
      { songId: 'a', date: '2020-01-01' },
      { songId: 'b', date: '2024-06-15' },
      { songId: 'a', date: '2021-03-03' },
    ];
    const out = orderSnapshotSongsByLatestPerformanceDesc(songs, performances);
    expect(out.map((s) => s.id)).toEqual(['b', 'a', 'c']);
  });

  it('ties break by title', () => {
    const songs = [
      { id: 'x', title: 'B', artist: 'A' },
      { id: 'y', title: 'A', artist: 'A' },
    ];
    const performances = [
      { songId: 'x', date: '2024-01-01' },
      { songId: 'y', date: '2024-01-01' },
    ];
    const out = orderSnapshotSongsByLatestPerformanceDesc(songs, performances);
    expect(out.map((s) => s.id)).toEqual(['y', 'x']);
  });
});
