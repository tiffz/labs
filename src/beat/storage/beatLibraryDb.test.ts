import { describe, expect, it } from 'vitest';
import { normalizePracticeData } from './beatLibraryDb';

describe('normalizePracticeData', () => {
  it('migrates legacy flat sections into a default lane', () => {
    const normalized = normalizePracticeData([
      { id: 's1', label: 'Section 1', startTime: 0, endTime: 10, source: 'manual' },
    ]);

    expect(normalized.lanes).toHaveLength(1);
    expect(normalized.lanes[0].id).toBe('lane-user-1');
    expect(normalized.sections[0].laneId).toBe('lane-user-1');
  });

  it('assigns missing laneId to the first available lane in lane payloads', () => {
    const normalized = normalizePracticeData({
      lanes: [{ id: 'lane-a', name: 'My Sections', createdAt: 1 }],
      sections: [{ id: 's1', label: 'Section 1', startTime: 0, endTime: 10, source: 'manual' }],
    });

    expect(normalized.sections[0].laneId).toBe('lane-a');
  });
});
