import { useMemo } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import type { Key } from '../../curriculum/types';

/**
 * Circle-of-fifths key selector — the "splashy", musician-native way to pick a
 * key. Keys are laid out around a ring (the `keys` list is already in
 * circle-of-fifths order), the selected one is highlighted, and the hub echoes
 * the choice back. Each key is a ≥44px touch target.
 */
export default function CircleOfFifths({
  keys,
  value,
  onChange,
  qualityLabel,
  size = 260,
}: {
  keys: readonly Key[];
  value: Key;
  onChange: (key: Key) => void;
  qualityLabel: string;
  size?: number;
}) {
  const btn = 46;
  const radius = size / 2 - btn / 2 - 2;
  const center = size / 2;

  const positioned = useMemo(
    () =>
      keys.map((k, i) => {
        const angle = (i / keys.length) * 2 * Math.PI - Math.PI / 2;
        return {
          k,
          left: center + radius * Math.cos(angle) - btn / 2,
          top: center + radius * Math.sin(angle) - btn / 2,
        };
      }),
    [keys, center, radius],
  );

  return (
    <Box
      role="group"
      aria-label="Circle of fifths key selector"
      sx={{ position: 'relative', width: size, height: size, mx: 'auto' }}
    >
      {/* Hub echoes the selection */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: btn + 6,
          borderRadius: '50%',
          border: theme => `1px dashed ${theme.palette.divider}`,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
        }}
      >
        <Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1 }}>{value}</Typography>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.25 }}>
            {qualityLabel}
          </Typography>
        </Box>
      </Box>

      {positioned.map(({ k, left, top }) => {
        const selected = k === value;
        return (
          <ButtonBase
            key={k}
            focusRipple
            onClick={() => onChange(k)}
            aria-label={`${k} ${qualityLabel}`}
            aria-pressed={selected}
            sx={{
              position: 'absolute',
              left,
              top,
              width: btn,
              height: btn,
              borderRadius: '50%',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: theme => `1.5px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
              bgcolor: selected ? 'primary.main' : 'background.paper',
              color: selected ? 'primary.contrastText' : 'text.primary',
              transition: 'transform 120ms ease, background-color 120ms ease',
              transform: selected ? 'scale(1.08)' : 'none',
              boxShadow: selected ? theme => `0 6px 16px ${theme.palette.primary.main}59` : 'none',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: selected ? 'primary.main' : 'action.hover',
              },
              '&:focus-visible': {
                outline: theme => `2px solid ${theme.palette.primary.main}`,
                outlineOffset: '2px',
              },
            }}
          >
            {k}
          </ButtonBase>
        );
      })}
    </Box>
  );
}
