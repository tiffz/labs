import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import type { ReactElement, ReactNode } from 'react';

import type { ComicProject } from '../types';
import { isWorkflowStageComplete } from '../workflow/lyreflyWorkflowCompletion';
import type { LyreflyStageCompletionContext } from '../workflow/lyreflyWorkflowCompletion';
import {
  LYREFLY_WORKFLOW_STAGES,
  nextWorkflowStage,
  workflowStageCaption,
  type LyreflyWorkflowStage,
} from '../workflow/lyreflyWorkflowStages';

export type LyreflyStageFooterProps = {
  project: ComicProject;
  stage: LyreflyWorkflowStage;
  ctx: LyreflyStageCompletionContext;
  onToggleComplete: () => void;
  onContinue: () => void;
  children?: ReactNode;
};

export function LyreflyStageFooter({
  project,
  stage,
  ctx,
  onToggleComplete,
  onContinue,
  children,
}: LyreflyStageFooterProps): ReactElement {
  const stageDone = isWorkflowStageComplete(project, stage, ctx);
  const nextStage = nextWorkflowStage(stage);
  const nextLabel = nextStage
    ? LYREFLY_WORKFLOW_STAGES.find((s) => s.id === nextStage)?.label
    : null;
  const currentMeta = LYREFLY_WORKFLOW_STAGES.find((s) => s.id === stage);

  return (
    <Box
      className="lyrefly-stage-footer"
      data-testid="lyrefly-stage-footer"
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        sx={{ px: { xs: 0, sm: 0 } }}
      >
        <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {currentMeta?.label}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {workflowStageCaption(stage)}
          </Typography>
          {children}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" flexWrap="wrap">
          <Button
            size="small"
            variant="text"
            onClick={onToggleComplete}
            startIcon={stageDone ? <CheckCircleIcon fontSize="small" /> : <CheckCircleOutlineIcon fontSize="small" />}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              color: stageDone ? 'primary.main' : 'text.secondary',
            }}
          >
            {stageDone ? 'Completed' : 'Mark complete'}
          </Button>
          {nextLabel ? (
            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={onContinue}
              data-testid="lyrefly-continue-next-stage"
            >
              Continue to {nextLabel}
            </Button>
          ) : (
            <Button variant="contained" onClick={onContinue} data-testid="lyrefly-finish-workflow">
              Back to gallery
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

export type LyreflyStageHeaderProps = {
  stage: LyreflyWorkflowStage;
  project: ComicProject;
  ctx: LyreflyStageCompletionContext;
  onToggleComplete: () => void;
};

export function LyreflyStageHeader({
  stage,
  project,
  ctx,
  onToggleComplete,
}: LyreflyStageHeaderProps): ReactElement {
  const theme = useTheme();
  const stageDone = isWorkflowStageComplete(project, stage, ctx);
  const meta = LYREFLY_WORKFLOW_STAGES.find((s) => s.id === stage);

  return (
    <Stack
      direction="row"
      alignItems="flex-start"
      justifyContent="space-between"
      spacing={2}
      className="lyrefly-stage-header"
      sx={{
        px: { xs: 2, sm: 3 },
        py: 2,
        borderBottom: 1,
        borderColor: alpha(theme.palette.primary.main, 0.1),
      }}
    >
      <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
          {meta?.label}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '40rem', lineHeight: 1.65 }}>
          {meta?.caption}
        </Typography>
      </Stack>
      <Button
        size="small"
        variant="text"
        onClick={onToggleComplete}
        startIcon={stageDone ? <CheckCircleIcon fontSize="small" /> : <CheckCircleOutlineIcon fontSize="small" />}
        sx={{
          flexShrink: 0,
          textTransform: 'none',
          fontWeight: 600,
          color: stageDone ? 'primary.main' : 'text.secondary',
        }}
      >
        {stageDone ? 'Completed' : 'Mark complete'}
      </Button>
    </Stack>
  );
}
