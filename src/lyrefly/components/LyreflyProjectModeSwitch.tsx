import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { alpha, useTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';

import { lyreflyProjectProfileHref, lyreflyProjectStageHref, navigateLyreflyHash } from '../routes/lyreflyHash';
import type { LyreflyWorkflowStage } from '../workflow/lyreflyWorkflowStages';

export type LyreflyProjectMode = 'editor' | 'profile';

export type LyreflyProjectModeSwitchProps = {
  projectId: string;
  mode: LyreflyProjectMode;
  /** Current editor stage — used when switching back to editor. */
  editorStage?: LyreflyWorkflowStage;
};

export function LyreflyProjectModeSwitch({
  projectId,
  mode,
  editorStage = 'brainstorm',
}: LyreflyProjectModeSwitchProps): ReactElement {
  const theme = useTheme();
  const border = alpha(theme.palette.text.primary, 0.12);
  const selectedBg = alpha(theme.palette.primary.main, 0.12);

  return (
    <ToggleButtonGroup
      className="lyrefly-project-mode-switch"
      value={mode}
      exclusive
      size="small"
      aria-label="Project view"
      data-testid="lyrefly-project-mode-switch"
      sx={{
        flexShrink: 0,
        '& .MuiToggleButton-root': {
          textTransform: 'none',
          fontSize: '0.75rem',
          fontWeight: 600,
          lineHeight: 1.2,
          px: 0.8,
          py: 0.25,
          borderColor: border,
          color: theme.palette.text.secondary,
        },
        '& .MuiToggleButton-root.Mui-selected': {
          bgcolor: selectedBg,
          color: theme.palette.text.primary,
          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.16) },
        },
      }}
    >
      <ToggleButton
        value="editor"
        aria-current={mode === 'editor' ? 'page' : undefined}
        onClick={() => {
          if (mode === 'editor') return;
          navigateLyreflyHash(lyreflyProjectStageHref(projectId, editorStage));
        }}
      >
        Editor
      </ToggleButton>
      <ToggleButton
        value="profile"
        aria-current={mode === 'profile' ? 'page' : undefined}
        onClick={() => {
          if (mode === 'profile') return;
          navigateLyreflyHash(lyreflyProjectProfileHref(projectId));
        }}
      >
        Profile
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
