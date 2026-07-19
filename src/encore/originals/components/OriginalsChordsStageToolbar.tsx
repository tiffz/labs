import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import type { ReactElement } from 'react';
import type { ChartLayout } from '../../../shared/music/chordPro/chordChartLayout';
import type { ChartPlaybackStep } from '../../../shared/music/chordPro/chartPlaybackSequence';
import { encoreSurfacePadX } from '../../theme/encoreM3Layout';
import type { EncoreOriginalSong } from '../types';
import { OriginalsChartExportMenu } from './OriginalsChartExportMenu';
import { OriginalsChordPlaybackBar } from './OriginalsChordPlaybackBar';
import { OriginalsChordsStageMeta } from './OriginalsChordsStageMeta';
import { OriginalsOpenInWordsButton } from './OriginalsOpenInWordsButton';

export type OriginalsChordsStageToolbarProps = {
  song: EncoreOriginalSong;
  layout: ChartLayout;
  stageDone: boolean;
  onActivePlaybackStepChange: (step: ChartPlaybackStep | null) => void;
  onSongChange: (patch: Partial<EncoreOriginalSong>) => void;
  onPersist: (next: EncoreOriginalSong) => void | Promise<void>;
  onToggleStageComplete: () => void;
};

/** Compact band: key + tempo + play on the left; export actions on the right. */
export function OriginalsChordsStageToolbar({
  song,
  layout,
  stageDone,
  onActivePlaybackStepChange,
  onSongChange,
  onPersist,
  onToggleStageComplete,
}: OriginalsChordsStageToolbarProps): ReactElement {
  return (
    <Stack
      direction="row"
      className="encore-originals-chords-toolbar"
      sx={{
        alignItems: "center",
        flexWrap: "wrap",
        flexShrink: 0,
        px: encoreSurfacePadX,
        py: 0.55,
        gap: 0.75,
        rowGap: 0.4
      }}>
      <OriginalsChordsStageMeta song={song} layout={layout} onChange={onSongChange} />
      <OriginalsChordPlaybackBar
        layout={layout}
        tempo={song.tempo}
        sectionPlaybackOverrides={song.sectionPlaybackOverrides}
        onActiveStepChange={onActivePlaybackStepChange}
      />
      <Box sx={{ flex: 1, minWidth: 8 }} />
      <Stack direction="row" spacing={0.15} className="encore-originals-chords-actions" sx={{
        alignItems: "center"
      }}>
        <OriginalsChartExportMenu song={song} layout={layout} onPersist={onPersist} />
        <OriginalsOpenInWordsButton song={song} />
      </Stack>
      <Tooltip title={stageDone ? 'Stage completed' : 'Mark stage complete'}>
        <IconButton
          size="small"
          aria-label={stageDone ? 'Stage completed' : 'Mark stage complete'}
          onClick={onToggleStageComplete}
          sx={{
            flexShrink: 0,
            color: stageDone ? 'primary.main' : 'text.secondary',
            p: 0.45,
          }}
        >
          {stageDone ? <CheckCircleIcon fontSize="small" /> : <CheckCircleOutlineIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
