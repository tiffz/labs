import Box from '@mui/material/Box';
import type { ReactElement } from 'react';
import type { ChartLayout } from '../../../shared/music/chordPro/chordChartLayout';
import type { ChartPlaybackStep } from '../../../shared/music/chordPro/chartPlaybackSequence';
import { OriginalChordPlayback } from './OriginalChordPlayback';

export type OriginalsChordPlaybackBarProps = {
  layout: ChartLayout;
  tempo: number;
  onActiveStepChange: (step: ChartPlaybackStep | null) => void;
};

export function OriginalsChordPlaybackBar({
  layout,
  tempo,
  onActiveStepChange,
}: OriginalsChordPlaybackBarProps): ReactElement {
  return (
    <Box className="encore-originals-chords-playback-bar encore-originals-no-print">
      <OriginalChordPlayback layout={layout} tempo={tempo} onActiveStepChange={onActiveStepChange} />
    </Box>
  );
}
