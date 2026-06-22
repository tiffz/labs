import CheckIcon from '@mui/icons-material/Check';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { Fragment, type ReactElement } from 'react';
import { inferredWorkflowStage, isOriginalDemoReady, isStageComplete } from '../originalsWorkflowCompletion';
import type { EncoreOriginalSong } from '../types';
import {
  ORIGINALS_WORKFLOW_STAGES,
  type OriginalsWorkflowStage,
} from '../originalsWorkflowStages';

/** Circle diameter — 28dp on the 8dp grid. Connectors align to this row height. */
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

type StepColumnProps = {
  stepNumber: number;
  label: string;
  active: boolean;
  completed: boolean;
  onClick: () => void;
};

function StepCircle({ stepNumber, active, completed }: Pick<StepColumnProps, 'stepNumber' | 'active' | 'completed'>): ReactElement {
  const theme = useTheme();

  return (
    <Box
      aria-hidden
      sx={{
        width: STEP_ICON_SIZE,
        height: STEP_ICON_SIZE,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        fontSize: '0.75rem',
        fontWeight: 700,
        border: 2,
        borderColor: active
          ? 'primary.main'
          : completed
            ? alpha(theme.palette.primary.main, 0.55)
            : alpha(theme.palette.text.primary, 0.16),
        bgcolor: completed
          ? alpha(theme.palette.primary.main, active ? 0.14 : 0.1)
          : active
            ? alpha(theme.palette.primary.main, 0.08)
            : 'background.paper',
        color: active || completed ? 'primary.main' : 'text.secondary',
      }}
    >
      {completed ? <CheckIcon sx={{ fontSize: 16 }} /> : stepNumber}
    </Box>
  );
}

function StepColumn({ stepNumber, label, active, completed, onClick }: StepColumnProps): ReactElement {
  const theme = useTheme();

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-current={active ? 'step' : undefined}
      aria-label={label}
      sx={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.25,
        px: 0.25,
        py: 0,
        border: 0,
        borderRadius: 1,
        bgcolor: 'transparent',
        cursor: 'pointer',
        color: active ? 'primary.main' : completed ? 'text.primary' : 'text.secondary',
        transition: theme.transitions.create(['background-color', 'color'], { duration: 180 }),
        '&:hover': {
          bgcolor: alpha(theme.palette.primary.main, 0.05),
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2,
        },
      }}
    >
      <StepCircle stepNumber={stepNumber} active={active} completed={completed} />
      <Typography
        variant="caption"
        component="span"
        aria-hidden
        sx={{
          fontWeight: active ? 700 : 600,
          fontSize: '0.8125rem',
          lineHeight: 1.25,
          textAlign: 'center',
          letterSpacing: '0.01em',
          px: 0.25,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

function StepConnector({ completed }: { completed: boolean }): ReactElement {
  const theme = useTheme();

  return (
    <Box
      aria-hidden
      sx={{
        height: 2,
        width: 1,
        borderRadius: 1,
        bgcolor: completed ? alpha(theme.palette.primary.main, 0.45) : alpha(theme.palette.text.primary, 0.1),
      }}
    />
  );
}

export function OriginalsWorkflowStepper({
  song,
  stage,
  onStageChange,
  highlightNextIncomplete = false,
}: OriginalsWorkflowStepperProps): ReactElement {
  const emphasisStage = highlightNextIncomplete
    ? isOriginalDemoReady(song)
      ? null
      : inferredWorkflowStage(song)
    : stage;

  return (
    <Box
      role="group"
      aria-label="Songwriting workflow"
      className="encore-originals-workflow-stepper"
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        width: 1,
      }}
    >
      {ORIGINALS_WORKFLOW_STAGES.map((step, index) => {
        const completed = isStageComplete(song, step.id);
        const active = emphasisStage !== null && step.id === emphasisStage;
        const prevStep = index > 0 ? ORIGINALS_WORKFLOW_STAGES[index - 1] : null;
        const connectorComplete = prevStep ? isStageComplete(song, prevStep.id) : false;

        return (
          <Fragment key={step.id}>
            {index > 0 ? (
              <Box
                sx={{
                  flex: '1 1 16px',
                  minWidth: 8,
                  maxWidth: 48,
                  height: STEP_ICON_SIZE,
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 1,
                }}
              >
                <StepConnector completed={connectorComplete} />
              </Box>
            ) : null}
            <StepColumn
              stepNumber={index + 1}
              label={step.label}
              active={active}
              completed={completed}
              onClick={() => onStageChange(step.id)}
            />
          </Fragment>
        );
      })}
    </Box>
  );
}
