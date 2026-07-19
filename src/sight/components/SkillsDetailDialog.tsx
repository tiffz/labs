import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import {
  countMasteredSkills,
  masteryDisplayForMatrix,
  MASTERY_STAR_COUNT,
  SKILL_VECTOR_COUNT,
} from '../progress/skillMastery';
import { SKILL_VECTOR_DESCRIPTIONS } from '../progress/skillDescriptions';
import { SKILL_VECTOR_LABELS } from '../progress/types';
import type { SkillMatrix } from '../progress/types';
import { TYPE } from './landing/sightLandingStyles';

function StarRow({ filled, total }: { filled: number; total: number }) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', gap: '2px', lineHeight: 1 }} aria-hidden>
      {Array.from({ length: total }, (_, i) => {
        const on = i < filled;
        return (
          <span
            key={i}
            className="material-symbols-outlined"
            style={{
              fontSize: 18,
              lineHeight: 1,
              color: on ? 'var(--sight-accent, #a78bfa)' : 'rgba(255, 255, 255, 0.18)',
              fontVariationSettings: on ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            star
          </span>
        );
      })}
    </Box>
  );
}

interface SkillsDetailDialogProps {
  open: boolean;
  matrix: SkillMatrix;
  onClose: () => void;
}

export default function SkillsDetailDialog({
  open,
  matrix,
  onClose,
}: SkillsDetailDialogProps): React.ReactElement {
  const items = masteryDisplayForMatrix(matrix);
  const mastered = countMasteredSkills(matrix);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="sight-skills-dialog-title"
      slotProps={{
        paper: {
          sx: {
            borderRadius: '20px',
            bgcolor: 'background.paper',
            backgroundImage: 'none',
          },
        }
      }}
    >
      <DialogTitle
        id="sight-skills-dialog-title"
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          pr: 1,
          pb: 0.5,
        }}
      >
        <Box>
          <Typography sx={{ ...TYPE.title, fontSize: '1.125rem' }}>Skills</Typography>
          <Typography sx={{ ...TYPE.caption, color: 'text.secondary', mt: 0.75 }}>
            {mastered}/{SKILL_VECTOR_COUNT} at Strong (4★). Updates as you practice.
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          aria-label="Close skills"
          size="small"
          sx={{ mt: -0.5, color: 'text.secondary' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }} aria-hidden>
            close
          </span>
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: { xs: 2.5, sm: 3 }, pt: 2, pb: 1 }}>
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {items.map(({ vector, stars, label }, index) => (
            <Box
              component="li"
              key={vector}
              sx={{
                py: 2,
                borderBottom:
                  index < items.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 1,
                  mb: 0.5,
                }}
              >
                <StarRow filled={stars} total={MASTERY_STAR_COUNT} />
                <Typography
                  component="span"
                  sx={{
                    fontSize: '0.9375rem',
                    fontWeight: 500,
                    color: 'text.primary',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {SKILL_VECTOR_LABELS[vector]}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontSize: '0.8125rem',
                    color: 'text.secondary',
                    letterSpacing: '0.02em',
                  }}
                >
                  · {label}
                </Typography>
              </Box>
              <Typography sx={{ ...TYPE.caption, color: 'text.secondary' }}>
                {SKILL_VECTOR_DESCRIPTIONS[vector]}
              </Typography>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 0 }}>
        <Button onClick={onClose} variant="text" sx={{ textTransform: 'none', fontWeight: 500 }}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
