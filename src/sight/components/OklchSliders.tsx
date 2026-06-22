import type { ReactElement } from 'react';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ColorState, ContextualLocks } from '../types';
import { clampColorState, colorStateToHex } from '../scoring/perceptualScore';

interface OklchSlidersProps {
  value: ColorState;
  onChange: (next: ColorState) => void;
  locked: ContextualLocks;
  showHex?: boolean;
  disabled?: boolean;
}

export default function OklchSliders({
  value,
  onChange,
  locked,
  showHex = false,
  disabled = false,
}: OklchSlidersProps): ReactElement {
  const set = (patch: Partial<ColorState>) => onChange(clampColorState({ ...value, ...patch }));

  return (
    <Stack spacing={1.5} className="sight-neutral-panel">
      <Stack direction="row" spacing={1} alignItems="center">
        <div
          className="sight-swatch"
          style={{ background: colorStateToHex(value), width: '3rem', height: '3rem' }}
          aria-hidden
        />
        {showHex && (
          <Typography variant="caption" className="sight-metrics" component="span">
            {colorStateToHex(value)}
          </Typography>
        )}
      </Stack>
      <div>
        <Typography variant="caption">Lightness (L)</Typography>
        <Slider
          size="small"
          min={0}
          max={1}
          step={0.005}
          value={value.l}
          onChange={(_, v) => set({ l: v as number })}
          disabled={disabled || locked.lightness}
          aria-label="Lightness"
        />
      </div>
      <div>
        <Typography variant="caption">Chroma (C)</Typography>
        <Slider
          size="small"
          min={0}
          max={0.4}
          step={0.005}
          value={value.c}
          onChange={(_, v) => set({ c: v as number })}
          disabled={disabled || locked.chroma}
          aria-label="Chroma"
        />
      </div>
      <div>
        <Typography variant="caption">Hue (H)</Typography>
        <Slider
          size="small"
          min={0}
          max={360}
          step={1}
          value={value.h}
          onChange={(_, v) => set({ h: v as number })}
          disabled={disabled || locked.hue}
          aria-label="Hue"
        />
      </div>
    </Stack>
  );
}
