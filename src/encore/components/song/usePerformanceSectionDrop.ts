import { useCallback, useEffect } from 'react';
import { useDragDropHighlight } from '../../../shared/hooks/useDragDropHighlight';
import { fileMatchesAccept } from '../../../shared/utils/fileMatchesAccept';
import { PERF_LOCAL_VIDEO_ACCEPT } from '../../utils/performanceVideoAccept';
import { setEncoreDropSurface } from './encoreDropSurface';
import { dataTransferHasPerformanceVideoFile } from './encoreDragPayload';

export type UsePerformanceSectionDropOptions = {
  enabled: boolean;
  onDropVideo: (file: File) => void;
  onDropNonVideo?: () => void;
};

export function usePerformanceSectionDrop(options: UsePerformanceSectionDropOptions): {
  dragActive: boolean;
  sectionHandlers: {
    onDragEnter: (e: React.DragEvent<HTMLElement>) => void;
    onDragOver: (e: React.DragEvent<HTMLElement>) => void;
    onDragLeave: (e: React.DragEvent<HTMLElement>) => void;
    onDrop: (e: React.DragEvent<HTMLElement>) => void;
  };
} {
  const { enabled, onDropVideo, onDropNonVideo } = options;

  const { dragActive, reset, handlers } = useDragDropHighlight({
    disabled: !enabled,
    stopPropagation: true,
    onDrop: (e) => {
      if (!enabled || !e.dataTransfer.types.includes('Files')) return;
      const files = Array.from(e.dataTransfer.files);
      const video = files.find((f) => fileMatchesAccept(f, PERF_LOCAL_VIDEO_ACCEPT));
      if (video) {
        onDropVideo(video);
      } else {
        onDropNonVideo?.();
      }
      setEncoreDropSurface(null);
    },
  });

  useEffect(() => {
    if (!dragActive) {
      setEncoreDropSurface(null);
      return;
    }
    setEncoreDropSurface('performance');
    return () => setEncoreDropSurface(null);
  }, [dragActive]);

  const onDragEnter = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      if (!enabled || !dataTransferHasPerformanceVideoFile(e.dataTransfer)) return;
      handlers.onDragEnter(e);
    },
    [enabled, handlers],
  );

  const onDragOver = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      if (!enabled || !dataTransferHasPerformanceVideoFile(e.dataTransfer)) return;
      handlers.onDragOver(e);
      try {
        e.dataTransfer.dropEffect = 'copy';
      } catch {
        /* non-fatal */
      }
    },
    [enabled, handlers],
  );

  const onDragLeave = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      if (!enabled) return;
      handlers.onDragLeave(e);
    },
    [enabled, handlers],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      if (!enabled) return;
      handlers.onDrop(e);
      reset();
    },
    [enabled, handlers, reset],
  );

  return {
    dragActive,
    sectionHandlers: { onDragEnter, onDragOver, onDragLeave, onDrop },
  };
}
