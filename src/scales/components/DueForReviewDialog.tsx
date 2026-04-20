import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { findExercise } from '../curriculum/tiers';
import { formatStageSummary } from '../curriculum/stageSummary';
import { getExerciseProgress, type ReviewEntry } from '../progress/store';
import type { ScalesProgressData } from '../progress/types';

function Icon({
  name,
  size = 20,
}: { name: string; size?: number }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{ fontSize: size, lineHeight: 1 }}
    >
      {name}
    </span>
  );
}

function relativeDaysAgo(iso: string | null): string {
  if (!iso) return 'not practiced yet';
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)),
  );
  if (days === 0) return 'practiced today';
  if (days === 1) return 'practiced yesterday';
  return `practiced ${days} days ago`;
}

export interface DueForReviewDialogProps {
  open: boolean;
  onClose: () => void;
  entries: ReviewEntry[];
  progress: ScalesProgressData;
}

/**
 * Modal listing exercises flagged for review. Opens when the user clicks
 * the Due-for-review card on the home screen. Each row tells the user
 * which specific stage of the exercise will be served in the next
 * session — not just that the exercise is flagged — so there's no
 * surprise when practice starts.
 */
export default function DueForReviewDialog({
  open,
  onClose,
  entries,
  progress,
}: DueForReviewDialogProps) {
  const rows = entries
    .map(entry => {
      const found = findExercise(entry.exerciseId);
      if (!found) return null;
      const ep = getExerciseProgress(progress, entry.exerciseId);
      const stage = found.exercise.stages.find(s => s.id === entry.stageId);
      return {
        id: entry.exerciseId,
        label: found.exercise.label,
        reason: entry.reason,
        stageSummary: stage ? formatStageSummary(stage) : null,
        stageNumber: stage?.stageNumber ?? null,
        lastPracticedAt: ep.lastPracticedAt,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          pb: 1,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 500,
              letterSpacing: '0.03125rem',
              textTransform: 'uppercase',
              color: 'text.secondary',
              mb: 0.5,
            }}
          >
            Your practice
          </Typography>
          <Typography component="h2" sx={{ fontSize: '1.375rem', fontWeight: 500, lineHeight: 1.3 }}>
            Due for review
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mt: 0.5 }}>
            {rows.length === 0
              ? 'Nothing is due right now.'
              : rows.length === 1
                ? '1 exercise will show up in your next practice session.'
                : `${rows.length} exercises will show up in your next practice session.`}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close" size="small" sx={{ mt: -0.5 }}>
          <Icon name="close" size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, py: 1 }}>
          {rows.map(row => {
            const accent = row.reason === 'shaky' ? 'warning.main' : 'primary.main';
            const bg = row.reason === 'shaky' ? 'warning.main' : 'primary.main';
            const reasonLabel = row.reason === 'shaky' ? 'Shaky last run' : 'Time for a refresher';
            const iconName = row.reason === 'shaky' ? 'error' : 'schedule';
            return (
              <Box
                key={row.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  px: 2,
                  py: 1.25,
                  borderRadius: '12px',
                  bgcolor: theme => `${theme.palette[row.reason === 'shaky' ? 'warning' : 'primary'].main}0D`,
                }}
              >
                <Box
                  aria-hidden="true"
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    bgcolor: theme => `${theme.palette[row.reason === 'shaky' ? 'warning' : 'primary'].main}1F`,
                    color: accent,
                  }}
                >
                  <Icon name={iconName} size={18} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.9375rem', fontWeight: 500, color: 'text.primary' }}>
                    {row.label}
                  </Typography>
                  {row.stageSummary && (
                    <Typography
                      sx={{
                        fontSize: '0.8125rem',
                        color: 'text.primary',
                        mt: 0.25,
                      }}
                    >
                      Level {row.stageNumber}: {row.stageSummary}
                    </Typography>
                  )}
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      mt: 0.25,
                    }}
                  >
                    {reasonLabel} · {relativeDaysAgo(row.lastPracticedAt)}
                  </Typography>
                </Box>
                {/* The subtle dot reinforces the accent without repeating the icon */}
                <Box
                  aria-hidden="true"
                  sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: bg, flexShrink: 0 }}
                />
              </Box>
            );
          })}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
