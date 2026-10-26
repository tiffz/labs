import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import Box from '@mui/material/Box';
import Button, { type ButtonProps } from '@mui/material/Button';
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

  const markCompleteButton = (done: boolean, props: ButtonProps = {}): ReactElement => (
    <Button
      size="small"
      variant="text"
      startIcon={done ? <CheckCircleIcon fontSize="small" /> : <CheckCircleOutlineIcon fontSize="small" />}
      className="lyrefly-workbench__mark-complete"
      sx={{
        textTransform: 'none',
        fontWeight: 600,
        color: done ? 'primary.main' : 'text.secondary',
        whiteSpace: 'nowrap',
      }}
      {...props}
    >
      {done ? 'Completed' : 'Mark complete'}
    </Button>
  );

  const continueButton = (label: string, props: ButtonProps = {}): ReactElement => (
    <Button
      size="small"
      variant={continueVariant}
      endIcon={<ArrowForwardIcon />}
      sx={{ whiteSpace: 'nowrap', fontWeight: emphasis === 'subtle' ? 600 : undefined }}
      {...props}
    >
      Continue to {label}
    </Button>
  );

  const finishButton = (props: ButtonProps = {}): ReactElement => (
    <Button
      size="small"
      variant="text"
      sx={{ whiteSpace: 'nowrap', fontWeight: 600, color: 'text.secondary' }}
      {...props}
    >
      Back to gallery
    </Button>
  );

  // Every stage's variants are laid out invisibly behind the live button, so the slot is always
  // as wide as its widest label and the stepper beside it holds still when the stage changes.
  const continueGhosts = [
    ...LYREFLY_WORKFLOW_STAGES.slice(1)
      .filter((s) => s.label !== nextLabel)
      .map((s) => continueButton(s.label, GHOST_BUTTON_PROPS)),
    ...(nextLabel ? [finishButton(GHOST_BUTTON_PROPS)] : []),
  ];

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
      <ReservedWidthSlot ghosts={[markCompleteButton(!stageDone, GHOST_BUTTON_PROPS)]}>
        {markCompleteButton(stageDone, { onClick: onToggleComplete })}
      </ReservedWidthSlot>
      <ReservedWidthSlot ghosts={continueGhosts}>
        {nextLabel
          ? continueButton(nextLabel, { onClick: onContinue, 'data-testid': 'lyrefly-continue-next-stage' } as ButtonProps)
          : finishButton({ onClick: onContinue, 'data-testid': 'lyrefly-finish-workflow' } as ButtonProps)}
      </ReservedWidthSlot>
    </Stack>
  );
}

const GHOST_BUTTON_PROPS: ButtonProps = { tabIndex: -1, disableRipple: true };

/** Stacks the live child over invisible, inert ghosts in one grid cell; the cell takes the widest. */
function ReservedWidthSlot({ children, ghosts }: { children: ReactElement; ghosts: ReactElement[] }): ReactElement {
  return (
    <Box sx={{ display: 'grid', justifyItems: 'end', alignItems: 'center', '& > *': { gridArea: '1 / 1' } }}>
      {ghosts.map((ghost, index) => (
        <Box key={index} aria-hidden inert sx={{ visibility: 'hidden', display: 'flex' }}>
          {ghost}
        </Box>
      ))}
      {children}
    </Box>
  );
}
