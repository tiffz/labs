import { useState } from 'react';
import Button from '@mui/material/Button';
import { countMasteredSkills, SKILL_VECTOR_COUNT } from '../progress/skillMastery';
import type { SkillMatrix } from '../progress/types';
import { textLinkButtonSx } from './landing/sightLandingStyles';
import SkillsDetailDialog from './SkillsDetailDialog';

interface SkillsMasteryLinkProps {
  matrix: SkillMatrix;
}

export default function SkillsMasteryLink({ matrix }: SkillsMasteryLinkProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const mastered = countMasteredSkills(matrix);

  return (
    <>
      <Button
        variant="text"
        onClick={() => setOpen(true)}
        endIcon={
          <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden>
            chevron_right
          </span>
        }
        aria-haspopup="dialog"
        sx={{
          ...textLinkButtonSx,
          fontSize: '0.8125rem',
          color: 'text.secondary',
          letterSpacing: '0.03em',
          '&:hover': { color: 'text.primary', bgcolor: 'transparent' },
          '& .MuiButton-endIcon': { ml: 0.25, opacity: 0.7 },
        }}
      >
        {mastered}/{SKILL_VECTOR_COUNT} skills mastered
      </Button>
      <SkillsDetailDialog open={open} matrix={matrix} onClose={() => setOpen(false)} />
    </>
  );
}
