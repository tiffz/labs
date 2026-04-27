import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/**
 * Small info-icon button + popover that explains the three mastery tiers
 * (Learning / Fluent / Mastered) using the same definitions surfaced in
 * the home stats, progress map, and mastery details dialog.
 *
 * The button is intentionally small (24px) so it can sit next to a
 * section header without competing for attention. Clicking opens a
 * popover anchored to the icon; pressing Esc or clicking outside
 * dismisses it.
 */
export default function MasteryTierLegend({
  ariaLabel = 'About the mastery tiers',
}: { ariaLabel?: string }) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        size="small"
        aria-label={ariaLabel}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          width: 24,
          height: 24,
          color: 'text.secondary',
          '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
        }}
      >
        <Box
          component="span"
          aria-hidden="true"
          className="material-symbols-outlined"
          sx={{ fontSize: 18, lineHeight: 1 }}
        >
          info
        </Box>
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              p: 2.5,
              maxWidth: 360,
              borderRadius: '16px',
            },
          },
        }}
      >
        <Typography
          sx={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'text.secondary',
            mb: 1.5,
          }}
        >
          Mastery tiers
        </Typography>

        <LegendRow
          name="Learning"
          tone="primary"
          icon="radio_button_unchecked"
          description="You're working through the levels for this exercise. Every one you pass counts as progress."
        />
        <LegendRow
          name="Fluent"
          tone="success-soft"
          icon="task_alt"
          description="You can play one octave at tempo, both hands, from memory. That's the Level 8 checkpoint."
        />
        <LegendRow
          name="Mastered"
          tone="success"
          icon="check_circle"
          description="Two octaves at full speed with sixteenth-note subdivisions, both hands, from memory. And practiced recently enough that it still feels easy in your fingers."
        />
      </Popover>
    </>
  );
}

type Tone = 'primary' | 'success-soft' | 'success';

function LegendRow({
  name,
  tone,
  icon,
  description,
}: {
  name: string;
  tone: Tone;
  icon: string;
  description: string;
}) {
  const accent =
    tone === 'success'
      ? 'success.main'
      : tone === 'success-soft'
      ? 'success.dark'
      : 'primary.main';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.25,
        mb: 1.25,
        '&:last-of-type': { mb: 0 },
      }}
    >
      <Box
        component="span"
        aria-hidden="true"
        className="material-symbols-outlined"
        sx={{
          fontSize: 18,
          lineHeight: 1,
          mt: '2px',
          color: accent,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: '0.875rem',
            fontWeight: 600,
            lineHeight: 1.25,
            color: accent,
            mb: 0.25,
          }}
        >
          {name}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.8125rem',
            lineHeight: 1.4,
            color: 'text.secondary',
          }}
        >
          {description}
        </Typography>
      </Box>
    </Box>
  );
}
