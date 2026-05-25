import { describe, expect, it } from 'vitest';
import {
  countSongsThatWouldGainMarkersFromSnapshot,
  countSongsWhereLocalHasMoreMarkers,
} from './stanzaDriveMarkerSummary';

describe('stanzaDriveMarkerSummary', () => {
  it('counts songs where local has more markers', () => {
    const local = [
      { id: 'a', ytId: null, title: 'A', markers: [{ time: 1, label: 'x' }, { time: 2, label: 'y' }], stats: {}, updatedAt: 1 },
    ];
    const remote = [{ id: 'a', ytId: 'v', title: 'A', markers: [], stats: {}, updatedAt: 2 }];
    expect(countSongsWhereLocalHasMoreMarkers(local, remote)).toBe(1);
  });

  it('counts songs that would gain markers from a snapshot', () => {
    const local = [{ id: 'a', ytId: null, title: 'A', markers: [], stats: {}, updatedAt: 1 }];
    const snap = [{ id: 'a', ytId: 'v', title: 'A', markers: [{ time: 5, label: 'm' }], stats: {}, updatedAt: 2 }];
    expect(countSongsThatWouldGainMarkersFromSnapshot(local, snap)).toBe(1);
  });
});
