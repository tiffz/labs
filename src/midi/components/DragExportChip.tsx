import { useCallback, useMemo } from 'react';
import Chip from '@mui/material/Chip';
import { useMidi } from '../useMidi';
import { buildExportBlob } from '../export/createMidiExportAdapter';

export function DragExportChip() {
  const { state } = useMidi();
  const getState = useCallback(() => state, [state]);

  const exportData = useMemo(() => buildExportBlob(getState), [getState]);

  const onDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!exportData) return;
      const url = URL.createObjectURL(exportData.blob);
      e.dataTransfer.setData(
        'DownloadURL',
        `audio/midi:${exportData.filename}:${url}`,
      );
      e.dataTransfer.effectAllowed = 'copy';
    },
    [exportData],
  );

  const onClick = useCallback(() => {
    if (!exportData) return;
    const url = URL.createObjectURL(exportData.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportData.filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportData]);

  if (!exportData) return null;

  return (
    <Chip
      label="Drag to Logic"
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="midi-export-chip"
      aria-label="Drag MIDI file to your DAW, or click to download"
    />
  );
}
