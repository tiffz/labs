import TextField from '@mui/material/TextField';
import type { ClipboardEvent, ReactElement } from 'react';
import type { PastedChartImportSummary } from '../../../../shared/music/chordPro/pastedChartImport';

export type OriginalsWriteModeProps = {
  value: string;
  onChange: (next: string) => void;
  /** When paste looks like an external chart, import sections + chords instead of plain text. */
  onImportPastedChart?: (raw: string) => PastedChartImportSummary;
  minRows?: number;
};

export function OriginalsWriteMode({
  value,
  onChange,
  onImportPastedChart,
  minRows = 12,
}: OriginalsWriteModeProps): ReactElement {
  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const raw = event.clipboardData.getData('text/plain');
    if (!raw || !onImportPastedChart) return;
    const result = onImportPastedChart(raw);
    if (result.ok) {
      event.preventDefault();
    }
  };

  return (
    <TextField
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onPaste={handlePaste}
      fullWidth
      multiline
      minRows={minRows}
      placeholder={'[Verse 1]\nWrite lyrics here…'}
      inputProps={{ 'aria-label': 'Lyrics chart' }}
      sx={{
        flex: 1,
        minHeight: 0,
        '& .MuiInputBase-root': {
          alignItems: 'stretch',
          fontSize: '1rem',
          lineHeight: 1.65,
          height: 1,
        },
      }}
    />
  );
}
