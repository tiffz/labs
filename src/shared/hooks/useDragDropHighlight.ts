import { useCallback, useRef, useState, type DragEvent } from 'react';

export type DragDropHighlightHandlers = {
  onDragEnter: (e: DragEvent<HTMLElement>) => void;
  onDragLeave: (e: DragEvent<HTMLElement>) => void;
  onDragOver: (e: DragEvent<HTMLElement>) => void;
  onDrop: (e: DragEvent<HTMLElement>) => void;
};

export type UseDragDropHighlightOptions = {
  disabled?: boolean;
  /** When true, call `preventDefault` + `stopPropagation` on enter/over/leave/drop. */
  stopPropagation?: boolean;
  onDrop?: (e: DragEvent<HTMLElement>) => void;
};

/**
 * Depth-counter drag highlight — avoids flicker when crossing child elements.
 * Used by {@link DragDropFileUpload} and Encore section drop targets.
 */
export function useDragDropHighlight(options?: UseDragDropHighlightOptions): {
  dragActive: boolean;
  reset: () => void;
  handlers: DragDropHighlightHandlers;
} {
  const { disabled, stopPropagation = false, onDrop: onDropExternal } = options ?? {};
  const depthRef = useRef(0);
  const [dragActive, setDragActive] = useState(false);

  const reset = useCallback(() => {
    depthRef.current = 0;
    setDragActive(false);
  }, []);

  const onDragEnter = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (disabled) return;
      e.preventDefault();
      if (stopPropagation) e.stopPropagation();
      depthRef.current += 1;
      setDragActive(true);
    },
    [disabled, stopPropagation],
  );

  const onDragLeave = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (disabled) return;
      e.preventDefault();
      if (stopPropagation) e.stopPropagation();
      depthRef.current = Math.max(0, depthRef.current - 1);
      if (depthRef.current === 0) setDragActive(false);
    },
    [disabled, stopPropagation],
  );

  const onDragOver = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (disabled) return;
      e.preventDefault();
      if (stopPropagation) e.stopPropagation();
    },
    [disabled, stopPropagation],
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (disabled) return;
      e.preventDefault();
      if (stopPropagation) e.stopPropagation();
      reset();
      onDropExternal?.(e);
    },
    [disabled, onDropExternal, reset, stopPropagation],
  );

  return {
    dragActive,
    reset,
    handlers: { onDragEnter, onDragLeave, onDragOver, onDrop },
  };
}
