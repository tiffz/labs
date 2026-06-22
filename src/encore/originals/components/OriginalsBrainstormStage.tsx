import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import { RichTextEditor } from '../../../shared/components/RichTextEditor';
import { encoreSurfaceContentPad, encoreSurfacePadX } from '../../theme/encoreM3Layout';
import { encoreHairline } from '../../theme/encoreUiTokens';
import type { EncoreOriginalSong } from '../types';
import { OriginalsSongFilesPanel } from './OriginalsSongFilesPanel';

export type OriginalsBrainstormStageProps = {
  song: EncoreOriginalSong;
  onBrainstormHtmlChange: (html: string) => void;
  onSongChange: (next: EncoreOriginalSong) => void;
  /** When paste looks like a chord chart, import to lyrics/chords instead of brainstorm text. */
  onPastePlainTextChart?: (raw: string) => boolean;
};

/** 256dp sidebar — 32 × 8dp grid unit. */
const sidebarWidth = 256;

export function OriginalsBrainstormStage({
  song,
  onBrainstormHtmlChange,
  onSongChange,
  onPastePlainTextChart,
}: OriginalsBrainstormStageProps): ReactElement {
  const theme = useTheme();

  return (
    <Box
      className="encore-originals-brainstorm-stage"
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'stretch',
      }}
    >
      <Box
        className="encore-originals-brainstorm-canvas"
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          px: encoreSurfaceContentPad,
          py: encoreSurfaceContentPad,
          pr: { md: 3 },
        }}
      >
        <RichTextEditor
          className="shared-rich-text-editor--fill shared-rich-text-editor--canvas"
          value={song.brainstormHtml ?? ''}
          onChange={onBrainstormHtmlChange}
          onPastePlainText={onPastePlainTextChart}
          placeholder="Capture themes, titles, rough lines… Paste a formatted chord chart to import sections and chords."
          aria-label="Song brainstorm"
          sx={{
            flex: 1,
            minHeight: 0,
            bgcolor: 'background.paper',
            borderColor: encoreHairline,
            boxShadow: 'none',
            '& .shared-rich-text-surface': {
              minHeight: 'min(74vh, 880px)',
              px: { xs: 2.5, sm: 4 },
              py: { xs: 3, sm: 4 },
              fontSize: '1.0625rem',
              lineHeight: 1.75,
            },
          }}
        />
      </Box>

      <Box
        className="encore-originals-brainstorm-sidebar"
        sx={{
          width: { xs: '100%', md: sidebarWidth },
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          maxHeight: { xs: 360, md: 'none' },
          borderLeft: { md: 1 },
          borderTop: { xs: 1, md: 0 },
          borderColor: encoreHairline,
          px: encoreSurfacePadX,
          py: encoreSurfaceContentPad,
          bgcolor: alpha(theme.palette.background.default, 0.35),
          overflowY: { md: 'auto' },
        }}
      >
        <OriginalsSongFilesPanel
          song={song}
          onChange={onSongChange}
          onOpenBrainstorm={() => {
            document.querySelector('.encore-originals-brainstorm-canvas')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }}
        />
      </Box>
    </Box>
  );
}
