import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useMemo, type ReactElement } from 'react';
import BpmInput from '../../../shared/components/music/BpmInput';
import type { ChartLayout } from '../../../shared/music/chordPro/chordChartLayout';
import {
  estimateChartPlaybackDurationMs,
  formatChartPlaybackDuration,
} from '../../../shared/music/chordPro/chartPlaybackSequence';
import { EncoreKeyChip } from '../../ui/EncoreKeyChip';
import type { EncoreOriginalSong } from '../types';

export type OriginalsChordsStageMetaProps = {
  song: EncoreOriginalSong;
  layout: ChartLayout;
  onChange: (patch: Partial<EncoreOriginalSong>) => void;
};

export function OriginalsChordsStageMeta({
  song,
  layout,
  onChange,
}: OriginalsChordsStageMetaProps): ReactElement {
  const playbackDurationLabel = useMemo(() => {
    const durationMs = estimateChartPlaybackDurationMs(layout, song.tempo);
    if (durationMs <= 0) return null;
    return formatChartPlaybackDuration(durationMs);
  }, [layout, song.tempo]);

  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      flexWrap="nowrap"
      useFlexGap
      className="encore-originals-chords-meta"
    >
      <EncoreKeyChip
        value={song.key}
        placeholder="Key"
        displayMode="compact"
        onChange={(next) => onChange({ key: next })}
        className="encore-originals-key-chip"
      />
      <BpmInput
        value={song.tempo}
        onChange={(next) => onChange({ tempo: Math.round(next) })}
        min={40}
        max={200}
        layout="inline"
        showRandomize={false}
        showRateActions={false}
        showPresetDropdown
        dropdownClassName="encore-repertoire-floating-menu encore-originals-bpm-dropdown"
        className="encore-originals-bpm-inline"
      />
      {playbackDurationLabel ? (
        <Tooltip title="Estimated chord playback length">
          <Typography
            component="span"
            variant="body2"
            color="text.secondary"
            className="encore-originals-playback-duration"
            sx={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: '30px', flexShrink: 0 }}
          >
            ~{playbackDurationLabel}
          </Typography>
        </Tooltip>
      ) : null}
    </Stack>
  );
}
