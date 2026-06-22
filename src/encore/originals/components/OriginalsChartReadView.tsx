import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo, useState, type ReactElement } from 'react';
import { parseChordProToChartLayout } from '../../../shared/music/chordPro/chordChartLayout';
import type { ChartPlaybackStep } from '../../../shared/music/chordPro/chartPlaybackSequence';
import { chartLayoutHasPaintedChords } from '../originalsChartLayoutHelpers';
import { originalsLyricsChartTexts } from '../originalsLyricsChartTexts';
import { useOriginalsChordNotation } from '../hooks/useOriginalsChordNotation';
import { OriginalChordPlayback } from './OriginalChordPlayback';
import { OriginalsPaintMode } from './chart/OriginalsPaintMode';
import { OriginalsChordPaletteNotationToggle } from './chart/OriginalsChordPaletteNotationToggle';

export type OriginalsChartReadViewProps = {
  lyricsAndChords: string;
  songId: string;
  songKey: string;
  tempo: number;
  /** Smaller play/settings controls for dashboard embeds. */
  compactPlayback?: boolean;
  /** Dashboard/detail embed — single-column chart, contained width. */
  embedded?: boolean;
};

/** Read-only styled chord chart with playback — same paint rendering as the chords editor. */
export function OriginalsChartReadView({
  lyricsAndChords,
  songId,
  songKey,
  tempo,
  compactPlayback = false,
  embedded = false,
}: OriginalsChartReadViewProps): ReactElement | null {
  const layout = useMemo(() => parseChordProToChartLayout(lyricsAndChords), [lyricsAndChords]);
  const hasPaintedChords = useMemo(() => chartLayoutHasPaintedChords(layout), [layout]);
  const { lyrics } = useMemo(() => originalsLyricsChartTexts(lyricsAndChords), [lyricsAndChords]);
  const [showChords, setShowChords] = useState(hasPaintedChords);
  const [activePlaybackStep, setActivePlaybackStep] = useState<ChartPlaybackStep | null>(null);
  const { notation, setNotation } = useOriginalsChordNotation(songId);

  if (!lyrics && !hasPaintedChords) return null;

  const showStyledChart = showChords && hasPaintedChords;

  return (
    <Stack spacing={1.25}>
      {hasPaintedChords ? (
        <Stack
          direction="row"
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          spacing={1}
          className="encore-originals-chart-read-toolbar"
        >
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={showChords}
                onChange={(_, checked) => setShowChords(checked)}
              />
            }
            label={
              <Typography variant="body2" color="text.secondary">
                Show chords
              </Typography>
            }
            sx={{ m: 0, alignItems: 'center', gap: 0.5 }}
          />
          {showStyledChart ? (
            <>
              <OriginalsChordPaletteNotationToggle notation={notation} onNotationChange={setNotation} />
              <OriginalChordPlayback
                layout={layout}
                tempo={tempo}
                compact={compactPlayback}
                onActiveStepChange={setActivePlaybackStep}
              />
            </>
          ) : null}
        </Stack>
      ) : null}

      {showStyledChart ? (
        <Box
          className={[
            'encore-originals-chart-read-view',
            'encore-originals-chart-read-view--readonly',
            embedded ? 'encore-originals-chart-read-view--embedded' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <OriginalsPaintMode
            readOnly
            layout={layout}
            songKey={songKey}
            notation={notation}
            activePlaybackStep={activePlaybackStep}
          />
        </Box>
      ) : (
        <Typography
          component="pre"
          variant="body1"
          sx={{
            whiteSpace: 'pre-wrap',
            m: 0,
            lineHeight: 1.65,
            color: 'text.primary',
          }}
        >
          {lyrics}
        </Typography>
      )}
    </Stack>
  );
}
