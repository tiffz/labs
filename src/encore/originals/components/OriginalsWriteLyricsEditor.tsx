import type { ReactElement } from 'react';
import type { PastedChartImportSummary } from '../../../shared/music/chordPro/pastedChartImport';
import { OriginalsWriteMode } from './chart/OriginalsWriteMode';

export type OriginalsWriteLyricsEditorProps = {
  value: string;
  onChange: (next: string) => void;
  onImportPastedChart?: (raw: string) => PastedChartImportSummary;
  minRows?: number;
};

export function OriginalsWriteLyricsEditor({
  value,
  onChange,
  onImportPastedChart,
  minRows = 12,
}: OriginalsWriteLyricsEditorProps): ReactElement {
  return (
    <OriginalsWriteMode
      value={value}
      onChange={onChange}
      onImportPastedChart={onImportPastedChart}
      minRows={minRows}
    />
  );
}
