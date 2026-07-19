import CheckIcon from '@mui/icons-material/Check';
import LibraryMusicOutlinedIcon from '@mui/icons-material/LibraryMusicOutlined';
import LyricsOutlinedIcon from '@mui/icons-material/LyricsOutlined';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useState, type ReactElement } from 'react';
import { copyTextToClipboard } from '../originalsChartClipboard';

export type OriginalsCopyChartButtonsProps = {
  lyrics: string;
  chordChart: string;
};

const copyButtonSx = {
  textTransform: 'none',
  fontWeight: 600,
  minWidth: 0,
  color: 'text.secondary',
  borderColor: 'divider',
  '&:hover': { borderColor: 'text.secondary', bgcolor: 'action.hover' },
} as const;

/** Copy lyrics and/or chord chart as plain text — distinct icons + labels so actions are scannable. */
export function OriginalsCopyChartButtons({
  lyrics,
  chordChart,
}: OriginalsCopyChartButtonsProps): ReactElement | null {
  const [copied, setCopied] = useState<'lyrics' | 'chart' | null>(null);
  if (!lyrics && !chordChart) return null;

  const onCopy = async (kind: 'lyrics' | 'chart', text: string) => {
    await copyTextToClipboard(text);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1400);
  };

  return (
    <Stack direction="row" spacing={0.75} useFlexGap sx={{
      flexWrap: "wrap"
    }}>
      {lyrics ? (
        <Button
          size="small"
          variant="outlined"
          startIcon={
            copied === 'lyrics' ? (
              <CheckIcon sx={{ fontSize: 16 }} aria-hidden />
            ) : (
              <LyricsOutlinedIcon sx={{ fontSize: 16 }} aria-hidden />
            )
          }
          aria-label="Copy lyrics"
          onClick={() => void onCopy('lyrics', lyrics)}
          sx={copyButtonSx}
        >
          {copied === 'lyrics' ? 'Copied' : 'Copy lyrics'}
        </Button>
      ) : null}
      {chordChart ? (
        <Button
          size="small"
          variant="outlined"
          startIcon={
            copied === 'chart' ? (
              <CheckIcon sx={{ fontSize: 16 }} aria-hidden />
            ) : (
              <LibraryMusicOutlinedIcon sx={{ fontSize: 16 }} aria-hidden />
            )
          }
          aria-label="Copy chart"
          onClick={() => void onCopy('chart', chordChart)}
          sx={copyButtonSx}
        >
          {copied === 'chart' ? 'Copied' : 'Copy chart'}
        </Button>
      ) : null}
    </Stack>
  );
}
