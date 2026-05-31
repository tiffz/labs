import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBeatPracticeLaneMutations } from './useBeatPracticeLaneMutations';
import { createUserLane } from '../utils/practiceSections';
import type { LaneSection } from '../utils/practiceSections';

describe('useBeatPracticeLaneMutations', () => {
  it('createManualSection appends a section on the active lane', () => {
    const lane = createUserLane('Lane 1');
    const pushPracticeHistory = vi.fn();
    const setUserSections = vi.fn();

    const { result } = renderHook(() =>
      useBeatPracticeLaneMutations({
        practiceLanes: [lane],
        userSections: [],
        activeLaneId: lane.id,
        analysisSections: [],
        setPracticeLanes: vi.fn(),
        setUserSections,
        setActiveLaneId: vi.fn(),
        pushPracticeHistory,
      })
    );

    act(() => {
      result.current.createManualSection(1, 5);
    });

    expect(pushPracticeHistory).toHaveBeenCalledOnce();
    expect(setUserSections).toHaveBeenCalledOnce();
    const updater = setUserSections.mock.calls[0]?.[0];
    expect(typeof updater).toBe('function');
    if (typeof updater === 'function') {
      const next = updater([]);
      expect(next).toHaveLength(1);
      expect(next[0]).toMatchObject({
        startTime: 1,
        endTime: 5,
        laneId: lane.id,
        label: 'Section 1',
      });
    }
  });

  it('renamePracticeSection ignores blank or unchanged labels', () => {
    const lane = createUserLane('Lane 1');
    const section: LaneSection = {
      id: 's1',
      startTime: 0,
      endTime: 10,
      label: 'Intro',
      laneId: lane.id,
      color: '#fff',
      confidence: 1,
    };
    const pushPracticeHistory = vi.fn();
    const setUserSections = vi.fn();

    const { result } = renderHook(() =>
      useBeatPracticeLaneMutations({
        practiceLanes: [lane],
        userSections: [section],
        activeLaneId: lane.id,
        analysisSections: [],
        setPracticeLanes: vi.fn(),
        setUserSections,
        setActiveLaneId: vi.fn(),
        pushPracticeHistory,
      })
    );

    act(() => {
      result.current.renamePracticeSection('s1', '   ');
      result.current.renamePracticeSection('s1', 'Intro');
    });

    expect(pushPracticeHistory).not.toHaveBeenCalled();
    expect(setUserSections).not.toHaveBeenCalled();
  });

  it('deletePracticeLane keeps at least one fallback lane', () => {
    const lane = createUserLane('Only Lane');
    const pushPracticeHistory = vi.fn();
    const setPracticeLanes = vi.fn();
    const setActiveLaneId = vi.fn();

    const { result } = renderHook(() =>
      useBeatPracticeLaneMutations({
        practiceLanes: [lane],
        userSections: [],
        activeLaneId: lane.id,
        analysisSections: [],
        setPracticeLanes,
        setUserSections: vi.fn(),
        setActiveLaneId,
        pushPracticeHistory,
      })
    );

    act(() => {
      result.current.deletePracticeLane(lane.id);
    });

    expect(setPracticeLanes).toHaveBeenCalledOnce();
    const updater = setPracticeLanes.mock.calls[0]?.[0];
    expect(typeof updater).toBe('function');
    if (typeof updater === 'function') {
      const next = updater([lane]);
      expect(next).toHaveLength(1);
      expect(next[0]?.name).toBe('Lane 1');
    }
    expect(setActiveLaneId).toHaveBeenCalled();
  });
});
