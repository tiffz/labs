import { useCallback, useEffect, useMemo } from 'react';
import type { DragEvent } from 'react';
import { useDragDropHighlight } from '../../shared/hooks/useDragDropHighlight';
import { collectDataTransferDropSnapshot } from '../../shared/utils/readDataTransferEntryFiles';
import type { GestureCollectionUploadHandle } from './useGestureCollectionUpload';

type UseGestureCollectionDropOptions = {
  disabled?: boolean;
  upload: GestureCollectionUploadHandle;
};

function dataTransferHasFiles(dataTransfer: DataTransfer): boolean {
  return [...dataTransfer.types].includes('Files');
}

export function useGestureCollectionDrop({ disabled, upload }: UseGestureCollectionDropOptions) {
  const { activity, uploadFromSnapshot } = upload;

  const processDrop = useCallback(
    (snapshot: ReturnType<typeof collectDataTransferDropSnapshot>) => {
      void uploadFromSnapshot(snapshot);
    },
    [uploadFromSnapshot],
  );

  const { dragActive, handlers: baseHandlers } = useDragDropHighlight({
    disabled,
    stopPropagation: true,
    onDrop: (e) => {
      const snapshot = collectDataTransferDropSnapshot(e.dataTransfer);
      processDrop(snapshot);
    },
  });

  const handlers = useMemo(
    () => ({
      onDragEnter: (e: DragEvent<HTMLElement>) => {
        if (disabled) return;
        if (!dataTransferHasFiles(e.dataTransfer)) return;
        baseHandlers.onDragEnter(e);
      },
      onDragLeave: baseHandlers.onDragLeave,
      onDragOver: (e: DragEvent<HTMLElement>) => {
        if (disabled) return;
        if (!dataTransferHasFiles(e.dataTransfer)) return;
        baseHandlers.onDragOver(e);
        try {
          e.dataTransfer.dropEffect = 'copy';
        } catch {
          /* non-fatal */
        }
      },
      onDrop: baseHandlers.onDrop,
    }),
    [baseHandlers, disabled],
  );

  useEffect(() => {
    const preventFileNavigation = (e: globalThis.DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
      }
    };
    window.addEventListener('dragover', preventFileNavigation);
    window.addEventListener('drop', preventFileNavigation);
    return () => {
      window.removeEventListener('dragover', preventFileNavigation);
      window.removeEventListener('drop', preventFileNavigation);
    };
  }, []);

  return {
    activity,
    dragActive,
    handlers,
  };
}
