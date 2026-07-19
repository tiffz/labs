import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import type { ReactElement } from 'react';

import type { ComicProject } from '../types';
import { isWorkflowStageComplete } from '../workflow/lyreflyWorkflowCompletion';
import type { LyreflyStageCompletionContext } from '../workflow/lyreflyWorkflowCompletion';
import { LYREFLY_WORKFLOW_STAGES, nextWorkflowStage, type LyreflyWorkflowStage } from '../workflow/lyreflyWorkflowStages';

export type LyreflyStageActionsProps = {
  project: ComicProject;
  stage: LyreflyWorkflowStage;
  ctx: LyreflyStageCompletionContext;
  onToggleComplete: () => void;
  onContinue: () => void;
  /** Gallery-first stages use quieter chrome so art stays primary. */
  emphasis?: 'default' | 'subtle';
  className?: string;
};

/** Mark complete + continue — lives in workbench chrome (no redundant stage copy). */
export function LyreflyStageActions({
  project,
  stage,
  ctx,
  onToggleComplete,
  onContinue,
  emphasis = 'default',
  className = 'lyrefly-workbench__actions',
}: LyreflyStageActionsProps): ReactElement {
  const stageDone = isWorkflowStageComplete(project, stage, ctx);
  const nextStage = nextWorkflowStage(stage);
  const nextLabel = nextStage ? LYREFLY_WORKFLOW_STAGES.find((s) => s.id === nextStage)?.label : null;

  const continueVariant = emphasis === 'subtle' ? 'text' : 'contained';

  return (
    <Stack
      direction="row"
      spacing={1}
      className={className || undefined}
      data-testid="lyrefly-stage-actions"
      sx={{
        alignItems: "center",
        justifyContent: "flex-end",
        flexWrap: "nowrap",
        flexShrink: 0,
        minWidth: 0
      }}>
      <Button
        size="small"
        variant="text"
        onClick={onToggleComplete}
        startIcon={stageDone ? <CheckCircleIcon fontSize="small" /> : <CheckCircleOutlineIcon fontSize="small" />}
        className="lyrefly-workbench__mark-complete"
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          color: stageDone ? 'primary.main' : 'text.secondary',
          whiteSpace: 'nowrap',
        }}
      >
        {stageDone ? 'Completed' : 'Mark complete'}
      </Button>
      {nextLabel ? (
        <Button
          size="small"
          variant={continueVariant}
          endIcon={<ArrowForwardIcon />}
          onClick={onContinue}
          data-testid="lyrefly-continue-next-stage"
          sx={{ whiteSpace: 'nowrap', fontWeight: emphasis === 'subtle' ? 600 : undefined }}
        >
          Continue to {nextLabel}
        </Button>
      ) : (
        <Button
          size="small"
          variant="text"
          onClick={onContinue}
          data-testid="lyrefly-finish-workflow"
          sx={{ whiteSpace: 'nowrap', fontWeight: 600, color: 'text.secondary' }}
        >
          Back to gallery
        </Button>
      )}
    </Stack>
  );
}
