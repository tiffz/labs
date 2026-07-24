import { useMemo, useRef } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import type { Key } from '../../curriculum/types';

/**
 * Circle-of-fifths key selector — the "splashy", musician-native way to pick a
 * key. The `keys` list is already in circle-of-fifths order, so adjacent keys
 * on the ring are a perfect fifth apart. Behaves as a single-select radio group:
 * one tab stop (the selected key), arrow keys move around the ring. The selected
 * key uses the shared secondary-selection treatment (tinted brand wash) so solid
 * brand green stays reserved for the Start action. Each key is a ≥44px target.
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
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

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

  const move = (delta: number) => {
    const current = keys.indexOf(value);
    const next = (current + delta + keys.length) % keys.length;
    onChange(keys[next]!);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
  };

  return (
    <Box
      role="radiogroup"
      aria-label="Key, circle of fifths"
      onKeyDown={onKeyDown}
      sx={{ position: 'relative', width: size, height: size, mx: 'auto' }}
    >
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute', inset: btn + 6, borderRadius: '50%',
          border: theme => `1px dashed ${theme.palette.divider}`,
          display: 'grid', placeItems: 'center', textAlign: 'center',
        }}
      >
        <Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1, color: 'primary.main' }}>
            {value}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.25 }}>
            {qualityLabel}
          </Typography>
        </Box>
      </Box>

      {positioned.map(({ k, left, top }, i) => {
        const selected = k === value;
        return (
          <ButtonBase
            key={k}
            ref={el => { refs.current[i] = el; }}
            focusRipple
            role="radio"
            aria-checked={selected}
            aria-label={`${k} ${qualityLabel}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(k)}
            sx={{
              position: 'absolute', left, top, width: btn, height: btn, borderRadius: '50%',
              fontWeight: 700, fontSize: '0.9rem',
              border: theme => `1.5px solid ${selected
                ? 'var(--labs-selection-secondary-border, ' + theme.palette.primary.main + ')'
                : theme.palette.divider}`,
              bgcolor: selected
                ? 'var(--labs-selection-secondary-bg, rgba(5, 150, 105, 0.14))'
                : 'background.paper',
              color: selected
                ? 'var(--labs-selection-secondary-fg, #047857)'
                : 'text.primary',
              transition: 'transform 120ms ease, background-color 120ms ease',
              transform: selected ? 'scale(1.08)' : 'none',
              '&:hover': { borderColor: 'primary.main', bgcolor: selected ? undefined : 'action.hover' },
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
