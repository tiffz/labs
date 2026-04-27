import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import MobileStepper from '@mui/material/MobileStepper';

function Icon({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{ fontSize: size, lineHeight: 1, display: 'inline-flex' }}
    >
      {name}
    </span>
  );
}

interface OnboardingCard {
  iconName: string;
  title: string;
  body: string;
  /** Background tint for the icon medallion. Keys reference the MUI palette. */
  accent: 'primary' | 'success' | 'warning' | 'info';
}

/**
 * The four practice principles surfaced on the onboarding modal. Order is
 * pedagogical: slowness first because every other principle depends on it,
 * hands-separately second as the most common mechanical fix, mistakes-as-
 * information third to neutralize frustration before it sets in, and
 * "little and often" last as the spacing/consolidation note that ties
 * the whole loop to the wider habit.
 *
 * Voice: warm teacher, second-person, one idea per sentence. Stay
 * accurate to what the app actually does (e.g. the score colors notes
 * after a run; the metronome on each level is fixed).
 */
const CARDS: OnboardingCard[] = [
  {
    iconName: 'speed',
    title: 'Slow is fast.',
    body: 'Exercises are introduced slowly first. Focus on matching the metronome click, then speed up as you get more comfortable.',
    accent: 'primary',
  },
  {
    iconName: 'back_hand',
    title: 'One hand at a time.',
    body: 'Each hand has its own fingering to memorize. Practice the right alone, then the left, then bring them together.',
    accent: 'info',
  },
  {
    iconName: 'lightbulb',
    title: 'Misses are information.',
    body: 'Each run records your accuracy and whether notes were late or early. Treat this information as a guide for where to focus on future runs.',
    accent: 'warning',
  },
  {
    iconName: 'event_repeat',
    title: 'Little and often.',
    body: 'Practicing a few minutes a day is better than cramming infrequently.',
    accent: 'success',
  },
];

export interface PracticeOnboardingProps {
  open: boolean;
  /**
   * Fired when the user dismisses the modal in any way (close icon,
   * "Got it" CTA, or backdrop click). Always commits the seen flag —
   * the user has demonstrably encountered the cards either way.
   */
  onDismiss: () => void;
}

/**
 * First-time "How to practice" overlay. A 4-card carousel of the
 * pedagogical fundamentals; the user can step through with Back / Next
 * arrows or tap the final "Got it" CTA to dismiss.
 *
 * Trigger contract:
 *   - Opens only when the user taps "How to practice" on Home (never
 *     auto-opens on the session screen, so first practice stays focused).
 *   - Dismissal sets `progress.seenOnboarding` via `MARK_ONBOARDING_SEEN`.
 */
export default function PracticeOnboarding({
  open,
  onDismiss,
}: PracticeOnboardingProps) {
  const [step, setStep] = useState(0);
  const total = CARDS.length;
  const card = CARDS[step];
  const isFirst = step === 0;
  const isLast = step === total - 1;

  const handleClose = () => {
    setStep(0);
    onDismiss();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="practice-onboarding-title"
      PaperProps={{
        sx: {
          borderRadius: '20px',
          overflow: 'hidden',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          pt: 1.5,
          pb: 0.5,
        }}
      >
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.05rem',
            textTransform: 'uppercase',
            color: 'text.secondary',
          }}
        >
          How to practice
        </Typography>
        <IconButton
          onClick={handleClose}
          size="small"
          aria-label="Close practice onboarding"
        >
          <Icon name="close" size={20} />
        </IconButton>
      </Box>
      <DialogContent
        sx={{
          px: 3,
          pb: 1,
          pt: 0,
          textAlign: 'center',
          minHeight: 280,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: theme => `${theme.palette[card.accent].main}1F`,
            color: theme => theme.palette[card.accent].main,
            mb: 0.5,
          }}
        >
          <Icon name={card.iconName} size={36} />
        </Box>
        <Typography
          id="practice-onboarding-title"
          component="h2"
          sx={{
            fontSize: '1.25rem',
            fontWeight: 700,
            lineHeight: 1.25,
            maxWidth: 320,
          }}
        >
          {card.title}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.9375rem',
            color: 'text.secondary',
            lineHeight: 1.5,
            maxWidth: 320,
          }}
        >
          {card.body}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2, pt: 0, flexDirection: 'column', gap: 1 }}>
        <MobileStepper
          variant="dots"
          steps={total}
          position="static"
          activeStep={step}
          sx={{
            width: '100%',
            justifyContent: 'space-between',
            bgcolor: 'transparent',
            '& .MuiMobileStepper-dot': {
              width: 8,
              height: 8,
            },
          }}
          backButton={
            <Button
              size="small"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={isFirst}
              sx={{ textTransform: 'none', minWidth: 72 }}
            >
              Back
            </Button>
          }
          nextButton={
            isLast ? (
              <Button
                size="small"
                variant="contained"
                onClick={handleClose}
                sx={{ textTransform: 'none', minWidth: 96, fontWeight: 600 }}
              >
                Got it
              </Button>
            ) : (
              <Button
                size="small"
                onClick={() => setStep(s => Math.min(total - 1, s + 1))}
                sx={{ textTransform: 'none', minWidth: 72, fontWeight: 600 }}
              >
                Next
              </Button>
            )
          }
        />
      </DialogActions>
    </Dialog>
  );
}
