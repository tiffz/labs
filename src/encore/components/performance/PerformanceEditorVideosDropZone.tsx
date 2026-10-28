import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { DragEvent, ReactElement, ReactNode } from 'react';
import { useCallback } from 'react';
import { useDragDropHighlight } from '../../../shared/hooks/useDragDropHighlight';
import { encorePerformanceSectionDropSx, encoreShadowSurface } from '../../theme/encoreUiTokens';
import { dataTransferHasPerformanceVideoFile } from '../song/encoreDragPayload';

type UsePerformanceEditorVideoDropOptions = {
  enabled: boolean;
  onDropVideos: (files: File[]) => void;
};

function usePerformanceEditorVideoDrop(options: UsePerformanceEditorVideoDropOptions): {
  dragActive: boolean;
  dropHandlers: {
    onDragEnter: (e: DragEvent<HTMLElement>) => void;
    onDragOver: (e: DragEvent<HTMLElement>) => void;
    onDragLeave: (e: DragEvent<HTMLElement>) => void;
    onDrop: (e: DragEvent<HTMLElement>) => void;
  };
} {
  const { enabled, onDropVideos } = options;

  const { dragActive, reset, handlers } = useDragDropHighlight({
    disabled: !enabled,
    stopPropagation: true,
    onDrop: (e) => {
      if (!enabled || !e.dataTransfer.types.includes('Files')) return;
      // Every file goes to the editor, which stages it and lists any that can't be used (ADR 0030).
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) onDropVideos(files);
    },
  });

  const onDragEnter = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (!enabled || !dataTransferHasPerformanceVideoFile(e.dataTransfer)) return;
      handlers.onDragEnter(e);
    },
    [enabled, handlers],
  );

  const onDragOver = useCallback(
    (e: DragEvent<HTMLElement>) => {
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
    (e: DragEvent<HTMLElement>) => {
      if (!enabled) return;
      handlers.onDragLeave(e);
    },
    [enabled, handlers],
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (!enabled) return;
      handlers.onDrop(e);
      reset();
    },
    [enabled, handlers, reset],
  );

  return {
    dragActive,
    dropHandlers: { onDragEnter, onDragOver, onDragLeave, onDrop },
  };
}

export type PerformanceEditorVideosDropZoneProps = {
  enabled: boolean;
  onDropVideos: (files: File[]) => void;
  /** Shown centered while a performance video drag is over the zone. */
  dropHint?: string;
  children: ReactNode;
};

/** Section-level drop target for the performance editor video stack. */
export function PerformanceEditorVideosDropZone(props: PerformanceEditorVideosDropZoneProps): ReactElement {
  const { enabled, onDropVideos, dropHint = 'Drop to add video', children } = props;
  const { dragActive, dropHandlers } = usePerformanceEditorVideoDrop({ enabled, onDropVideos });

  return (
    <Box
      onDragEnter={dropHandlers.onDragEnter}
      onDragOver={dropHandlers.onDragOver}
      onDragLeave={dropHandlers.onDragLeave}
      onDrop={dropHandlers.onDrop}
      sx={(theme) => ({
        position: 'relative',
        borderRadius: 1,
        ...encorePerformanceSectionDropSx(theme, dragActive),
      })}
    >
      {children}
      {dragActive ? (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            borderRadius: 1,
            zIndex: 1,
          }}
        >
          <Typography variant="caption" sx={(theme) => ({
            px: 1.5,
            py: 0.625,
            borderRadius: 999,
            bgcolor: theme.palette.background.paper,
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, 0.18),
            color: alpha(theme.palette.primary.main, 0.78),
            fontWeight: 600,
            fontSize: '0.8125rem',
            letterSpacing: '-0.01em',
            boxShadow: encoreShadowSurface,
          })}>
            {dropHint}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}
