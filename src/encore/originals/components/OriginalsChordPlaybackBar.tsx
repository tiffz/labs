import Box from '@mui/material/Box';
import type { ReactElement } from 'react';
import type { ChartLayout } from '../../../shared/music/chordPro/chordChartLayout';
import type { ChartPlaybackStep } from '../../../shared/music/chordPro/chartPlaybackSequence';
import type { SectionPlaybackOverride } from '../../../shared/music/resolveSectionPlaybackSettings';
import { OriginalChordPlayback } from './OriginalChordPlayback';

export type OriginalsChordPlaybackBarProps = {
  layout: ChartLayout;
  tempo: number;
  sectionPlaybackOverrides?: Record<string, SectionPlaybackOverride>;
  onActiveStepChange: (step: ChartPlaybackStep | null) => void;
};

export function OriginalsChordPlaybackBar({
  layout,
  tempo,
  sectionPlaybackOverrides,
  onActiveStepChange,
}: OriginalsChordPlaybackBarProps): ReactElement {
  return (
    <Box className="encore-originals-chords-playback-bar encore-originals-no-print">
      <OriginalChordPlayback
        layout={layout}
        tempo={tempo}
        sectionPlaybackOverrides={sectionPlaybackOverrides}
        onActiveStepChange={onActiveStepChange}
      />
    </Box>
  );
}
