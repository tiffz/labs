import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo, useState, type ReactElement } from 'react';
import { originalsLyricsChartTexts } from '../originalsLyricsChartTexts';

export type OriginalsLyricsChartPanelProps = {
  lyricsAndChords: string;
};

/** Combined lyrics + chord chart read view with chord toggle. */
export function OriginalsLyricsChartPanel({ lyricsAndChords }: OriginalsLyricsChartPanelProps): ReactElement | null {
  const { lyrics, chordChart } = useMemo(() => originalsLyricsChartTexts(lyricsAndChords), [lyricsAndChords]);
  const hasChords = chordChart.length > 0;
  const [showChords, setShowChords] = useState(hasChords);

  if (!lyrics && !chordChart) return null;

  const displayText = showChords && hasChords ? chordChart : lyrics;
  const mono = showChords && hasChords;

  return (
    <Stack spacing={1.25}>
      {hasChords ? (
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
      ) : null}
      <Typography
        component="pre"
        variant="body1"
        sx={{
          fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit',
          fontSize: mono ? '0.875rem' : undefined,
          whiteSpace: 'pre-wrap',
          m: 0,
          lineHeight: mono ? 1.5 : 1.65,
          color: 'text.primary',
        }}
      >
        {displayText}
      </Typography>
    </Stack>
  );
}
