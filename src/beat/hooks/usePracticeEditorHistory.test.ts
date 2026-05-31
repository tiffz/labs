import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePracticeEditorHistory } from './usePracticeEditorHistory';
import { createUserLane } from '../utils/practiceSections';
import type { LaneSection } from '../utils/practiceSections';

function buildHarness(initialSections: LaneSection[] = []) {
  const lane = createUserLane('Lane 1');
  let practiceLanes = [lane];
  let userSections = initialSections;
  let activeLaneId: string | null = lane.id;

  const setPracticeLanes = vi.fn(
    (updater: typeof practiceLanes | ((prev: typeof practiceLanes) => typeof practiceLanes)) => {
      practiceLanes = typeof updater === 'function' ? updater(practiceLanes) : updater;
    }
  );
  const setUserSections = vi.fn(
    (updater: typeof userSections | ((prev: typeof userSections) => typeof userSections)) => {
      userSections = typeof updater === 'function' ? updater(userSections) : updater;
    }
  );
  const setActiveLaneId = vi.fn((value: string | null) => {
    activeLaneId = value;
  });

  const hook = renderHook(
    ({ lanes, sections, activeId }) =>
      usePracticeEditorHistory({
        practiceLanes: lanes,
        userSections: sections,
        activeLaneId: activeId,
        setPracticeLanes,
        setUserSections,
        setActiveLaneId,
      }),
    {
      initialProps: {
        lanes: practiceLanes,
        sections: userSections,
        activeId: activeLaneId,
      },
    }
  );

  return {
    hook,
    setUserSections,
    rerender: () =>
      hook.rerender({
        lanes: practiceLanes,
        sections: userSections,
        activeId: activeLaneId,
      }),
  };
}

describe('usePracticeEditorHistory', () => {
  it('undo restores the previous practice editor snapshot', () => {
    vi.useFakeTimers();
    const lane = createUserLane('Lane 1');
    const section: LaneSection = {
      id: 's1',
      startTime: 0,
      endTime: 10,
      label: 'Section 1',
      laneId: lane.id,
      color: '#fff',
      confidence: 1,
    };

    const harness = buildHarness([]);
    harness.rerender();

    act(() => {
      harness.hook.result.current.pushPracticeHistory();
    });

    act(() => {
      harness.setUserSections([section]);
    });
    harness.rerender();

    act(() => {
      harness.hook.result.current.undoPracticeEdit();
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(harness.setUserSections).toHaveBeenCalled();
    const lastCall = harness.setUserSections.mock.calls.at(-1)?.[0];
    expect(Array.isArray(lastCall)).toBe(true);
    expect(lastCall).toEqual([]);

    vi.useRealTimers();
  });

  it('redo reapplies an undone edit', () => {
    vi.useFakeTimers();
    const harness = buildHarness([]);
    harness.rerender();

    act(() => {
      harness.hook.result.current.pushPracticeHistory();
    });
    act(() => {
      harness.setUserSections([
        {
          id: 's1',
          startTime: 0,
          endTime: 10,
          label: 'Section 1',
          laneId: createUserLane('Lane 1').id,
          color: '#fff',
          confidence: 1,
        },
      ]);
    });
    harness.rerender();

    act(() => {
      harness.hook.result.current.undoPracticeEdit();
      harness.hook.result.current.redoPracticeEdit();
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(harness.setUserSections.mock.calls.length).toBeGreaterThan(1);
    vi.useRealTimers();
  });
});
