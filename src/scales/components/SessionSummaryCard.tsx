import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import { alpha } from '@mui/material/styles';
import type { SessionExerciseSummary } from '../store';
import type { SessionPlan } from './../curriculum/types';
import { findStage } from '../curriculum/tiers';

interface Props {
  summary: SessionExerciseSummary[];
  /** Forward-looking tip is built from the next plan, when one is available. */
  upcomingPlan: SessionPlan | null;
  /** Tighter padding and row spacing for post-session home (fits small viewports). */
  compact?: boolean;
}

interface StatusVisual {
  icon: string;
  label: string;
  color: 'success' | 'success-soft' | 'primary';
}

function statusVisual(status: SessionExerciseSummary['status']): StatusVisual {
  switch (status) {
    case 'cleared':
      return { icon: 'check_circle', label: 'Cleared', color: 'success' };
    case 'drilled':
      return { icon: 'task_alt', label: 'Drilled', color: 'success-soft' };
    case 'shaky':
    default:
      return { icon: 'autorenew', label: 'Keep going', color: 'primary' };
  }
}

/**
 * Build a one-line forward-looking tip for the next session's first
 * exercise. Combines the exercise/stage label (so the user knows what to
 * expect) with a short snippet of either the per-exercise guidance or
 * the stage description (whichever is more concise).
 */
function buildForwardTip(plan: SessionPlan | null): {
  headline: string;
  detail: string;
} | null {
  if (!plan || plan.exercises.length === 0) return null;
  const first = plan.exercises[0];
  const found = findStage(first.exerciseId, first.stageId);
  if (!found) return null;
  const { exercise, stage } = found;

  const headline = `${exercise.label} \u00b7 ${stage.label}`;

  let detail = '';
  if (exercise.guidance) {
    if (typeof exercise.guidance === 'string') {
      detail = exercise.guidance;
    } else {
      detail =
        exercise.guidance.both ??
        exercise.guidance.right ??
        exercise.guidance.left ??
        '';
    }
  }
  if (!detail) {
    detail = stage.description;
  }
  // Trim to one or two short sentences so the card stays compact.
  const firstStop = detail.indexOf('. ');
  if (firstStop > 0 && firstStop < detail.length - 1) {
    detail = detail.slice(0, firstStop + 1);
  }

  return { headline, detail };
}

export default function SessionSummaryCard({ summary, upcomingPlan, compact = false }: Props) {
  const tip = buildForwardTip(upcomingPlan);
  if (summary.length === 0 && !tip) return null;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: compact ? { xs: 2, md: 2.5 } : { xs: 4, md: 5 },
        borderRadius: '16px',
        borderColor: 'divider',
        textAlign: 'left',
        mb: compact ? { xs: 3, md: 4 } : { xs: 6, md: 8 },
        maxWidth: 720,
        mx: 'auto',
      }}
    >
      <Typography
        sx={{
          fontSize: '0.6875rem',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'text.secondary',
          mb: compact ? 1 : 2,
        }}
      >
        This session
      </Typography>

      {summary.length > 0 ? (
        <Box
          component="ul"
          sx={{
            listStyle: 'none',
            p: 0,
            m: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: compact ? 0.5 : 1,
          }}
        >
          {summary.map((row) => {
            const v = statusVisual(row.status);
            const pct = Math.round(row.bestAccuracy * 100);
            return (
              <Box
                key={row.exerciseId}
                component="li"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: compact ? 1 : 1.5,
                  px: compact ? 1.5 : 2,
                  py: compact ? 0.625 : 1.25,
                  borderRadius: '10px',
                  bgcolor:
                    v.color === 'success'
                      ? (theme) => alpha(theme.palette.success.main, 0.12)
                      : v.color === 'success-soft'
                      ? (theme) => alpha(theme.palette.success.main, 0.06)
                      : (theme) => alpha(theme.palette.primary.main, 0.08),
                }}
              >
                <Box
                  component="span"
                  aria-hidden="true"
                  className="material-symbols-outlined"
                  sx={{
                    fontSize: 20,
                    lineHeight: 1,
                    color:
                      v.color === 'success'
                        ? 'success.main'
                        : v.color === 'success-soft'
                        ? 'success.dark'
                        : 'primary.main',
                  }}
                >
                  {v.icon}
                </Box>
                <Typography
                  sx={{
                    flex: 1,
                    fontSize: '0.9375rem',
                    fontWeight: 500,
                    color: 'text.primary',
                  }}
                >
                  {row.exerciseLabel}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: 'text.secondary',
                    fontVariantNumeric: 'tabular-nums',
                    flexShrink: 0,
                  }}
                >
                  {`${v.label} \u00b7 best ${pct}%`}
                </Typography>
              </Box>
            );
          })}
        </Box>
      ) : null}

      {tip && (
        <Box
          sx={{
            mt: summary.length > 0 ? (compact ? 2 : 3) : 0,
            pt: summary.length > 0 ? (compact ? 2 : 3) : 0,
            borderTop: summary.length > 0 ? 1 : 0,
            borderColor: 'divider',
          }}
        >
          <Typography
            sx={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'text.secondary',
              mb: compact ? 0.5 : 1,
            }}
          >
            Up next
          </Typography>
          <Typography
            sx={{
              fontSize: '0.9375rem',
              fontWeight: 500,
              color: 'text.primary',
              mb: 0.5,
            }}
          >
            {tip.headline}
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
            {tip.detail}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
