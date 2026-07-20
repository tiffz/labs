import CheckIcon from '@mui/icons-material/Check';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';

import type { ComicProject } from '../types';
import { isWorkflowStageComplete } from '../workflow/lyreflyWorkflowCompletion';
import type { LyreflyStageCompletionContext } from '../workflow/lyreflyWorkflowCompletion';
import { LYREFLY_WORKFLOW_STAGES, type LyreflyWorkflowStage } from '../workflow/lyreflyWorkflowStages';

const STEP_ICON_SIZE = 28;
const STEP_ICON_SIZE_COMPACT = 22;

export type LyreflyWorkflowStepperProps = {
  project: ComicProject;
  stage: LyreflyWorkflowStage;
  onStageChange: (stage: LyreflyWorkflowStage) => void;
  ctx: LyreflyStageCompletionContext;
  compact?: boolean;
};

type StepCircleProps = {
  stepNumber: number;
  active: boolean;
  completed: boolean;
  iconSize: number;
};

function StepCircle({ stepNumber, active, completed, iconSize }: StepCircleProps): ReactElement {
  const theme = useTheme();
  const showCheck = completed && !active;
  const primary = theme.palette.primary.main;

  let borderColor: string;
  let bgcolor: string;
  let color: string;
  let boxShadow: string;

  if (active) {
    borderColor = primary;
    bgcolor = primary;
    color = theme.palette.primary.contrastText;
    boxShadow = `0 0 0 2px ${alpha(primary, 0.16)}`;
  } else if (completed) {
    borderColor = alpha(primary, 0.42);
    bgcolor = theme.palette.background.paper;
    color = alpha(primary, 0.68);
    boxShadow = `0 0 0 2px ${theme.palette.background.paper}`;
  } else {
    borderColor = alpha(theme.palette.text.primary, 0.16);
    bgcolor = theme.palette.background.paper;
    color = alpha(theme.palette.text.secondary, 0.72);
    boxShadow = `0 0 0 2px ${theme.palette.background.paper}`;
  }

  return (
    <Box
      aria-hidden
      className={[
        'lyrefly-workflow-stepper__circle',
        active ? 'lyrefly-workflow-stepper__circle--current' : '',
        completed ? 'lyrefly-workflow-stepper__circle--complete' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      sx={{
        width: iconSize,
        height: iconSize,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        fontSize: '0.75rem',
        fontWeight: active ? 700 : 600,
        lineHeight: 1,
        border: 2,
        borderColor,
        bgcolor,
        color,
        boxShadow,
        position: 'relative',
        zIndex: 2,
      }}
    >
      {showCheck ? <CheckIcon sx={{ fontSize: 14 }} /> : stepNumber}
    </Box>
  );
}

type StepButtonProps = {
  stepNumber: number;
  label: string;
  active: boolean;
  completed: boolean;
  onClick: () => void;
  iconSize: number;
  compact: boolean;
};

function StepButton({
  stepNumber,
  label,
  active,
  completed,
  onClick,
  iconSize,
  compact,
}: StepButtonProps): ReactElement {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const labelColor = active
    ? primary
    : completed
      ? theme.palette.text.secondary
      : alpha(theme.palette.text.secondary, 0.88);

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-current={active ? 'step' : undefined}
      aria-label={active ? `${label} (current step)` : label}
      className={[
        'lyrefly-workflow-stepper__step',
        active ? 'lyrefly-workflow-stepper__step--current' : '',
        completed ? 'lyrefly-workflow-stepper__step--complete' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      sx={{
        flex: '1 1 0',
        minWidth: 0,
        maxWidth: '9.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: compact ? 0.3 : 0.55,
        px: { xs: 0.35, sm: 0.65 },
        py: 0,
        border: 0,
        bgcolor: 'transparent',
        cursor: 'pointer',
        color: labelColor,
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 4,
          borderRadius: 1,
        },
      }}
    >
      <StepCircle stepNumber={stepNumber} active={active} completed={completed} iconSize={iconSize} />
      <Typography
        variant="caption"
        component="span"
        aria-hidden
        sx={{
          fontWeight: active ? 700 : 500,
          fontSize: { xs: '0.75rem', sm: '0.8125rem' },
          lineHeight: 1.25,
          textAlign: 'center',
          maxWidth: '8.5rem',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

export function LyreflyWorkflowStepper({
  project,
  stage,
  onStageChange,
  ctx,
  compact = false,
}: LyreflyWorkflowStepperProps): ReactElement {
  const theme = useTheme();
  const stepCount = LYREFLY_WORKFLOW_STAGES.length;
  const emphasisIndex = LYREFLY_WORKFLOW_STAGES.findIndex((s) => s.id === stage);
  const trackProgress = stepCount <= 1 ? 0 : Math.max(0, emphasisIndex) / (stepCount - 1);
  const trackInset = `${50 / stepCount}%`;
  const iconSize = compact ? STEP_ICON_SIZE_COMPACT : STEP_ICON_SIZE;

  return (
    <Box
      role="group"
      aria-label="Comic workflow"
      className={[
        'lyrefly-workflow-stepper',
        compact ? 'lyrefly-workflow-stepper--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid="lyrefly-workflow-stepper"
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        width: 1,
        px: { xs: 0.25, sm: compact ? 0.25 : 0.75 },
        pb: compact ? 0 : 0.35,
      }}
    >
      <Box
        aria-hidden
        className="lyrefly-workflow-stepper__track"
        sx={{
          position: 'absolute',
          top: iconSize / 2,
          left: trackInset,
          right: trackInset,
          height: 2,
          transform: 'translateY(-50%)',
          borderRadius: 1,
          bgcolor: alpha(theme.palette.text.primary, 0.08),
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <Box
          className="lyrefly-workflow-stepper__track-fill"
          sx={{
            height: '100%',
            width: `${Math.max(0, Math.min(1, trackProgress)) * 100}%`,
            bgcolor: alpha(theme.palette.primary.main, 0.36),
            transition: theme.transitions.create('width', { duration: 220 }),
          }}
        />
      </Box>

      {LYREFLY_WORKFLOW_STAGES.map((step, index) => {
        const completed = isWorkflowStageComplete(project, step.id, ctx);
        const active = step.id === stage;

        return (
          <StepButton
            key={step.id}
            stepNumber={index + 1}
            label={step.label}
            active={active}
            completed={completed}
            onClick={() => onStageChange(step.id)}
            iconSize={iconSize}
            compact={compact}
          />
        );
      })}
    </Box>
  );
}
