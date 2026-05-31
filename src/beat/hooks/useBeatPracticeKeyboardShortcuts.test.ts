import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBeatPracticeKeyboardShortcuts } from './useBeatPracticeKeyboardShortcuts';

function keyDown(init: KeyboardEventInit & { target?: HTMLElement }) {
  const { target, ...rest } = init;
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...rest });
  Object.defineProperty(event, 'target', { value: target ?? document.body });
  window.dispatchEvent(event);
  return event;
}

describe('useBeatPracticeKeyboardShortcuts', () => {
  it('calls undo on cmd+z outside editable fields', () => {
    const undoPracticeEdit = vi.fn();
    renderHook(() =>
      useBeatPracticeKeyboardShortcuts({
        undoPracticeEdit,
        redoPracticeEdit: vi.fn(),
        handleDeleteSelectedPracticeSections: vi.fn(),
        handlePlayPause: vi.fn(),
        selectedSectionCount: 0,
      })
    );

    const event = keyDown({ key: 'z', metaKey: true, target: document.body });
    expect(event.defaultPrevented).toBe(true);
    expect(undoPracticeEdit).toHaveBeenCalledOnce();
  });

  it('calls handlePlayPause on space outside form controls', () => {
    const handlePlayPause = vi.fn();
    renderHook(() =>
      useBeatPracticeKeyboardShortcuts({
        undoPracticeEdit: vi.fn(),
        redoPracticeEdit: vi.fn(),
        handleDeleteSelectedPracticeSections: vi.fn(),
        handlePlayPause,
        selectedSectionCount: 0,
      })
    );

    keyDown({ code: 'Space', target: document.body });
    expect(handlePlayPause).toHaveBeenCalledOnce();
  });

  it('deletes selected sections on Delete when sections are selected', () => {
    const handleDeleteSelectedPracticeSections = vi.fn();
    renderHook(() =>
      useBeatPracticeKeyboardShortcuts({
        undoPracticeEdit: vi.fn(),
        redoPracticeEdit: vi.fn(),
        handleDeleteSelectedPracticeSections,
        handlePlayPause: vi.fn(),
        selectedSectionCount: 2,
      })
    );

    const event = keyDown({ key: 'Delete', target: document.body });
    expect(event.defaultPrevented).toBe(true);
    expect(handleDeleteSelectedPracticeSections).toHaveBeenCalledOnce();
  });

  it('ignores shortcuts while typing in inputs', () => {
    const undoPracticeEdit = vi.fn();
    const handlePlayPause = vi.fn();
    renderHook(() =>
      useBeatPracticeKeyboardShortcuts({
        undoPracticeEdit,
        redoPracticeEdit: vi.fn(),
        handleDeleteSelectedPracticeSections: vi.fn(),
        handlePlayPause,
        selectedSectionCount: 1,
      })
    );

    keyDown({ key: 'z', metaKey: true, target: document.createElement('input') });
    keyDown({ code: 'Space', target: document.createElement('textarea') });
    expect(undoPracticeEdit).not.toHaveBeenCalled();
    expect(handlePlayPause).not.toHaveBeenCalled();
  });
});
