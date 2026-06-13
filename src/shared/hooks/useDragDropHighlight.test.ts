import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDragDropHighlight } from './useDragDropHighlight';

function dragEvent(): React.DragEvent<HTMLElement> {
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as React.DragEvent<HTMLElement>;
}

describe('useDragDropHighlight', () => {
  it('tracks depth and resets on drop', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useDragDropHighlight({ onDrop, stopPropagation: true }));

    act(() => {
      result.current.handlers.onDragEnter(dragEvent());
    });
    expect(result.current.dragActive).toBe(true);

    act(() => {
      result.current.handlers.onDrop(dragEvent());
    });
    expect(result.current.dragActive).toBe(false);
    expect(onDrop).toHaveBeenCalledTimes(1);
  });

  it('clears highlight when depth returns to zero on leave', () => {
    const { result } = renderHook(() => useDragDropHighlight());

    act(() => {
      result.current.handlers.onDragEnter(dragEvent());
      result.current.handlers.onDragLeave(dragEvent());
    });
    expect(result.current.dragActive).toBe(false);
  });
});
