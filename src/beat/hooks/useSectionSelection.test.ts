import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSectionSelection } from './useSectionSelection';
import type { Section } from '../utils/sectionDetector';

const sections: Section[] = [
  { id: 'a', startTime: 10, endTime: 20, label: 'A', color: '#fff', confidence: 1 },
  { id: 'b', startTime: 20, endTime: 30, label: 'B', color: '#fff', confidence: 1 },
];

describe('useSectionSelection', () => {
  it('uses exact boundaries when snapToMeasures is false', () => {
    const setLoopRegion = vi.fn();
    const seek = vi.fn();
    const { result } = renderHook(() =>
      useSectionSelection({
        sections,
        bpm: 120,
        musicStartTime: 0,
        musicEndTime: 60,
        beatsPerMeasure: 4,
        duration: 60,
        mergeSections: vi.fn(),
        splitSection: vi.fn(),
        setLoopRegion,
        setLoopEnabled: vi.fn(),
        seek,
        loopRegion: null,
        snapToMeasures: false,
      })
    );

    act(() => {
      result.current.selectSection(sections[0], false);
    });

    expect(setLoopRegion).toHaveBeenCalledWith({ startTime: 10, endTime: 20 });
    expect(seek).toHaveBeenCalledWith(10);
  });

  it('snaps loop boundaries to measure edges when snapToMeasures is true', () => {
    const setLoopRegion = vi.fn();
    const seek = vi.fn();
    const unevenSections: Section[] = [
      { id: 'snap-1', startTime: 10.2, endTime: 19.6, label: 'Snap', color: '#fff', confidence: 1 },
    ];
    const { result } = renderHook(() =>
      useSectionSelection({
        sections: unevenSections,
        bpm: 120,
        musicStartTime: 0,
        musicEndTime: 60,
        beatsPerMeasure: 4,
        duration: 60,
        mergeSections: vi.fn(),
        splitSection: vi.fn(),
        setLoopRegion,
        setLoopEnabled: vi.fn(),
        seek,
        loopRegion: null,
        snapToMeasures: true,
      })
    );

    act(() => {
      result.current.selectSection(unevenSections[0], false);
    });

    expect(setLoopRegion).toHaveBeenCalledWith({ startTime: 10, endTime: 20 });
    expect(seek).toHaveBeenCalledWith(10);
  });
});
