import CheckIcon from '@mui/icons-material/Check';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LibraryMusicOutlinedIcon from '@mui/icons-material/LibraryMusicOutlined';
import LyricsOutlinedIcon from '@mui/icons-material/LyricsOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Tooltip, { tooltipClasses, type TooltipProps } from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import { useMemo, useState, type MouseEvent, type ReactElement, type ReactNode } from 'react';
import { LABS_POPOVER_CHROME_SX } from '../../../shared/components/anchoredPopoverChrome';
import { copyTextToClipboard, originalChartClipboardTexts } from '../originalsChartClipboard';
import { encoreAppHref, handleSpaLinkClick } from '../../routes/encoreAppHash';
import { navigateToOriginalLyricEdit } from '../originalsLibraryNavigation';

const LyricsHoverTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    ...LABS_POPOVER_CHROME_SX,
    color: theme.palette.text.primary,
    maxWidth: 420,
    padding: 0,
    pointerEvents: 'auto',
  },
}));

const hoverActionSx = {
  textTransform: 'none',
  minWidth: 0,
  px: 0.75,
  py: 0.25,
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'text.secondary',
  '& .MuiButton-startIcon': { mr: 0.35 },
  '& .MuiButton-startIcon > *:nth-of-type(1)': { fontSize: 14 },
} as const;

function stopRowClick(event: MouseEvent): void {
  event.stopPropagation();
  event.preventDefault();
}

export type OriginalsLyricsHoverCardProps = {
  songId: string;
  lyricsAndChords: string;
  children: ReactNode;
};

/** Hover preview of lyrics or chord chart (one at a time) with copy + edit actions. */
export function OriginalsLyricsHoverCard({
  songId,
  lyricsAndChords,
  children,
}: OriginalsLyricsHoverCardProps): ReactElement {
  const [copied, setCopied] = useState<'lyrics' | 'chart' | null>(null);
  const texts = useMemo(() => originalChartClipboardTexts(lyricsAndChords), [lyricsAndChords]);

  if (!texts.previewKind) {
    return <>{children}</>;
  }

  const previewTitle = texts.previewKind === 'chordChart' ? 'Chord chart' : 'Lyrics';
  const previewFont =
    texts.previewKind === 'chordChart'
      ? 'ui-monospace, SFMono-Regular, Menlo, monospace'
      : 'inherit';

  const onCopy = async (kind: 'lyrics' | 'chart', text: string) => {
    await copyTextToClipboard(text);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1400);
  };

  return (
    <LyricsHoverTooltip
      enterDelay={400}
      enterNextDelay={400}
      leaveDelay={120}
      placement="top-start"
      disableInteractive={false}
      title={
        <Box
          onClick={ stopRowClick}
          onMouseDown={ stopRowClick}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 360,
            minWidth: 280,
          }}
        >
          <Box sx={{ px: 2, pt: 1.75, pb: 0.75, flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>
              {previewTitle}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', px: 2, pb: 1 }}>
            <Typography
              component="pre"
              variant="body2"
              sx={{
                fontFamily: previewFont,
                whiteSpace: 'pre-wrap',
                m: 0,
                lineHeight: texts.previewKind === 'chordChart' ? 1.45 : 1.55,
                fontSize: texts.previewKind === 'chordChart' ? '0.8125rem' : undefined,
              }}
            >
              {texts.previewText}
            </Typography>
          </Box>
          <Stack
            direction="row"
            spacing={0.5}
            useFlexGap
            flexWrap="wrap"
            sx={{
              flexShrink: 0,
              px: 1.5,
              py: 1,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            {texts.lyrics ? (
              <Button
                size="small"
                variant="text"
                startIcon={
                  copied === 'lyrics' ? (
                    <CheckIcon aria-hidden />
                  ) : (
                    <LyricsOutlinedIcon aria-hidden />
                  )
                }
                onClick={() => void onCopy('lyrics', texts.lyrics)}
                sx={hoverActionSx}
              >
                {copied === 'lyrics' ? 'Copied' : 'Copy lyrics' }
              </Button>
            ) : null}
            {texts.chordChart ? (
              <Button
                size="small"
                variant="text"
                startIcon={
                  copied === 'chart' ? (
                    <CheckIcon aria-hidden />
                  ) : (
                    <LibraryMusicOutlinedIcon aria-hidden />
                  )
                }
                onClick={() => void onCopy('chart', texts.chordChart)}
                sx={hoverActionSx}
              >
                {copied === 'chart' ? 'Copied' : 'Copy chart' }
              </Button>
            ) : null}
            <Button
              size="small"
              variant="text"
              component="a"
              href={encoreAppHref({ kind: 'original', id: songId })}
              startIcon={<EditOutlinedIcon aria-hidden />}
              onClick={(e) => {
                stopRowClick(e);
                handleSpaLinkClick(e, () => navigateToOriginalLyricEdit(songId));
              }}
              sx={hoverActionSx}
            >
              Edit
            </Button>
          </Stack>
        </Box>
      }
    >
      <Box
        component="span"
        onClick={ stopRowClick}
        onMouseDown={ stopRowClick}
        sx={{ display: 'block', minWidth: 0, maxWidth: '100%' }}
      >
        {children}
      </Box>
    </LyricsHoverTooltip>
  );
}
