import CheckIcon from '@mui/icons-material/Check';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { type ReactElement } from 'react';
import { inferredWorkflowStage, isOriginalDemoReady, isStageComplete } from '../originalsWorkflowCompletion';
import type { EncoreOriginalSong } from '../types';
import {
  ORIGINALS_WORKFLOW_STAGES,
  type OriginalsWorkflowStage,
} from '../originalsWorkflowStages';

const STEP_ICON_SIZE = 28;

export type OriginalsWorkflowStepperProps = {
  song: EncoreOriginalSong;
  stage: OriginalsWorkflowStage;
  onStageChange: (stage: OriginalsWorkflowStage) => void;
  /**
   * Dashboard/read-only surfaces: emphasize the first incomplete stage only.
   * Edit workspace: omit (highlights the stage you are editing).
   */
  highlightNextIncomplete?: boolean;
};

type StepCircleProps = {
  stepNumber: number;
  active: boolean;
  completed: boolean;
};

function StepCircle({ stepNumber, active, completed }: StepCircleProps): ReactElement {
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
    boxShadow = `0 0 0 3px ${alpha(primary, 0.2)}, 0 0 0 5px ${alpha(primary, 0.08)}`;
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
        'encore-originals-workflow-stepper__circle',
        active ? 'encore-originals-workflow-stepper__circle--current' : '',
        completed ? 'encore-originals-workflow-stepper__circle--complete' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      sx={{
        width: STEP_ICON_SIZE,
        height: STEP_ICON_SIZE,
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
        transition: theme.transitions.create(['border-color', 'background-color', 'color', 'box-shadow'], {
          duration: 180,
        }),
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
};

function StepButton({ stepNumber, label, active, completed, onClick }: StepButtonProps): ReactElement {
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
        'encore-originals-workflow-stepper__step',
        active ? 'encore-originals-workflow-stepper__step--current' : '',
        completed ? 'encore-originals-workflow-stepper__step--complete' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      sx={{
        flex: '1 1 0',
        minWidth: 0,
        maxWidth: '7.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 0.75,
        px: { xs: 0.25, sm: 0.5 },
        py: 0,
        border: 0,
        borderRadius: 0,
        bgcolor: 'transparent',
        cursor: 'pointer',
        color: labelColor,
        opacity: 1,
        transition: theme.transitions.create(['color'], { duration: 180 }),
        '&:hover': {
          color: active ? primary : theme.palette.text.primary,
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 4,
          borderRadius: 1,
        },
      }}
    >
      <StepCircle stepNumber={stepNumber} active={active} completed={completed} />
      <Typography
        variant="caption"
        component="span"
        aria-hidden
        sx={{
          fontWeight: active ? 700 : 500,
          fontSize: { xs: '0.6875rem', sm: '0.75rem' },
          lineHeight: 1.25,
          textAlign: 'center',
          letterSpacing: active ? '0.01em' : 0,
          maxWidth: '6.75rem',
          color: 'inherit',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

export function OriginalsWorkflowStepper({
  song,
  stage,
  onStageChange,
  highlightNextIncomplete = false,
}: OriginalsWorkflowStepperProps): ReactElement {
  const theme = useTheme();
  const stepCount = ORIGINALS_WORKFLOW_STAGES.length;
  const emphasisStage = highlightNextIncomplete
    ? isOriginalDemoReady(song)
      ? null
      : inferredWorkflowStage(song)
    : stage;

  const emphasisIndex =
    emphasisStage != null
      ? ORIGINALS_WORKFLOW_STAGES.findIndex((step) => step.id === emphasisStage)
      : ORIGINALS_WORKFLOW_STAGES.reduce(
          (last, step, index) => (isStageComplete(song, step.id) ? index : last),
          0,
        );

  const trackProgress =
    stepCount <= 1 ? 0 : Math.max(0, emphasisIndex) / (stepCount - 1);
  const trackInset = `${50 / stepCount}%`;

  return (
    <Box
      role="group"
      aria-label="Songwriting workflow"
      className="encore-originals-workflow-stepper"
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        width: 1,
        px: { xs: 0.5, sm: 1 },
        pb: 0.25,
      }}
    >
      <Box
        aria-hidden
        className="encore-originals-workflow-stepper__track"
        sx={{
          position: 'absolute',
          top: STEP_ICON_SIZE / 2,
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
          className="encore-originals-workflow-stepper__track-fill"
          sx={{
            height: '100%',
            width: `${Math.max(0, Math.min(1, trackProgress)) * 100}%`,
            bgcolor: alpha(theme.palette.primary.main, 0.32),
            transition: theme.transitions.create('width', { duration: 220 }),
          }}
        />
      </Box>

      {ORIGINALS_WORKFLOW_STAGES.map((step, index) => {
        const completed = isStageComplete(song, step.id);
        const active = emphasisStage !== null && step.id === emphasisStage;

        return (
          <StepButton
            key={step.id}
            stepNumber={index + 1}
            label={step.label}
            active={active}
            completed={completed}
            onClick={() => onStageChange(step.id)}
          />
        );
      })}
    </Box>
  );
}
