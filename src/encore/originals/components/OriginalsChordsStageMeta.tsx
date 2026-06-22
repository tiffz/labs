import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useMemo, type ReactElement } from 'react';
import type { ChartLayout } from '../../../shared/music/chordPro/chordChartLayout';
import {
  estimateChartPlaybackDurationMs,
  formatChartPlaybackDuration,
} from '../../../shared/music/chordPro/chartPlaybackSequence';
import { EncoreBpmChip } from '../../ui/EncoreBpmChip';
import { EncoreKeyChip } from '../../ui/EncoreKeyChip';
import { EncoreTimeSignatureChip } from '../../ui/EncoreTimeSignatureChip';
import type { EncoreOriginalSong } from '../types';
import { originalSongTimeSignature } from '../types';

const META_CHIP_CLASS = 'encore-originals-meta-chip';

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
        className={META_CHIP_CLASS}
      />
      <EncoreTimeSignatureChip
        value={originalSongTimeSignature(song)}
        onChange={(next) => onChange({ timeSignature: next })}
        className={META_CHIP_CLASS}
      />
      <EncoreBpmChip
        value={song.tempo}
        onChange={(next) => onChange({ tempo: next })}
        min={40}
        max={200}
        className={META_CHIP_CLASS}
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
