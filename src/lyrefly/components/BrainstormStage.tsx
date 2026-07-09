import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';

import { RichTextEditor } from '../../shared/components/RichTextEditor';
import type { ComicProject, VisualDevAsset } from '../types';
import { VisualDevPanel } from './VisualDevPanel';

const sidebarWidth = 280;

export type BrainstormStageProps = {
  project: ComicProject;
  assets: VisualDevAsset[];
  onBrainstormHtmlChange: (html: string) => void;
};

export function BrainstormStage({ project, assets, onBrainstormHtmlChange }: BrainstormStageProps): ReactElement {
  const theme = useTheme();

  return (
    <Box
      className="lyrefly-brainstorm-stage"
      data-testid="lyrefly-brainstorm-stage"
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'stretch',
      }}
    >
      <Box
        className="lyrefly-brainstorm-canvas"
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          p: { xs: 2, sm: 3 },
          pr: { md: 2 },
        }}
      >
        <RichTextEditor
          className="shared-rich-text-editor--fill shared-rich-text-editor--canvas"
          value={project.brainstormHtml ?? ''}
          onChange={onBrainstormHtmlChange}
          placeholder="Capture themes, character notes, scene fragments, and rough story beats…"
          aria-label="Comic brainstorm"
          sx={{
            flex: 1,
            minHeight: 0,
            bgcolor: alpha(theme.palette.background.paper, 0.88),
            borderColor: alpha(theme.palette.primary.main, 0.16),
            boxShadow: `0 12px 40px ${alpha(theme.palette.primary.dark, 0.12)}`,
            '& .shared-rich-text-surface': {
              minHeight: 'min(68vh, 820px)',
              px: { xs: 2.5, sm: 4 },
              py: { xs: 3, sm: 4 },
              fontSize: '1.0625rem',
              lineHeight: 1.75,
            },
          }}
        />
      </Box>

      <Box
        className="lyrefly-brainstorm-sidebar"
        sx={{
          width: { xs: '100%', md: sidebarWidth },
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          maxHeight: { xs: 420, md: 'none' },
          borderLeft: { md: 1 },
          borderTop: { xs: 1, md: 0 },
          borderColor: alpha(theme.palette.primary.main, 0.12),
          p: { xs: 2, sm: 2.5 },
          bgcolor: alpha(theme.palette.background.default, 0.45),
          overflowY: { md: 'auto' },
        }}
      >
        <VisualDevPanel projectId={project.id} assets={assets} />
      </Box>
    </Box>
  );
}
