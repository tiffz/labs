import { useCallback, useMemo } from 'react';
import type { DragEvent } from 'react';
import { useDragDropHighlight } from '../../shared/hooks/useDragDropHighlight';
import { collectDataTransferDropSnapshot } from '../../shared/utils/readDataTransferEntryFiles';
import type { GestureCollectionUploadHandle } from './useGestureCollectionUpload';

type UsePackCollectionDropOptions = {
  enabled: boolean;
  packId: string;
  upload?: GestureCollectionUploadHandle;
};

function dataTransferHasFiles(dataTransfer: DataTransfer): boolean {
  return [...dataTransfer.types].includes('Files');
}

export function usePackCollectionDrop({ enabled, packId, upload }: UsePackCollectionDropOptions) {
  const busy = upload?.busy ?? false;
  const uploadPhotosToPack = upload?.uploadPhotosToPack;

  const processDrop = useCallback(
    (snapshot: ReturnType<typeof collectDataTransferDropSnapshot>) => {
      if (!uploadPhotosToPack) return;
      void uploadPhotosToPack(packId, snapshot);
    },
    [packId, uploadPhotosToPack],
  );

  const { dragActive, handlers: baseHandlers } = useDragDropHighlight({
    disabled: !enabled || busy || !uploadPhotosToPack,
    stopPropagation: true,
    onDrop: (e) => {
      const snapshot = collectDataTransferDropSnapshot(e.dataTransfer);
      processDrop(snapshot);
    },
  });

  const handlers = useMemo(
    () => ({
      onDragEnter: (e: DragEvent<HTMLElement>) => {
        if (!enabled || busy) return;
        if (!dataTransferHasFiles(e.dataTransfer)) return;
        baseHandlers.onDragEnter(e);
      },
      onDragLeave: baseHandlers.onDragLeave,
      onDragOver: (e: DragEvent<HTMLElement>) => {
        if (!enabled || busy) return;
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
    [baseHandlers, busy, enabled],
  );

  return { dragActive, handlers };
}
