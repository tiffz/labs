import { useEffect, useMemo } from 'react';
import type { DragEvent } from 'react';

import { useDragDropHighlight } from '../../shared/hooks/useDragDropHighlight';

type UseZineboxLibraryDropOptions = {
  disabled?: boolean;
  onFiles: (files: File[]) => void;
};

function dataTransferHasFiles(dataTransfer: DataTransfer): boolean {
  return [...dataTransfer.types].includes('Files');
}

function pdfFilesFromDataTransfer(dataTransfer: DataTransfer): File[] {
  return [...dataTransfer.files].filter((file) => file.name.toLowerCase().endsWith('.pdf'));
}

export function useZineboxLibraryDrop({ disabled, onFiles }: UseZineboxLibraryDropOptions): {
  dragActive: boolean;
  handlers: {
    onDragEnter: (e: DragEvent<HTMLElement>) => void;
    onDragLeave: (e: DragEvent<HTMLElement>) => void;
    onDragOver: (e: DragEvent<HTMLElement>) => void;
    onDrop: (e: DragEvent<HTMLElement>) => void;
  };
} {
  const { dragActive, handlers: baseHandlers } = useDragDropHighlight({
    disabled,
    stopPropagation: true,
    onDrop: (e) => {
      const pdfs = pdfFilesFromDataTransfer(e.dataTransfer);
      if (pdfs.length > 0) onFiles(pdfs);
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

  return { dragActive, handlers };
}
