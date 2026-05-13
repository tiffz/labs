import Slider from '@mui/material/Slider';
import type { SliderProps } from '@mui/material/Slider';

const DEFAULT_STEP = 0.02;

const BASE_SX: NonNullable<SliderProps['sx']> = {
  flex: '1 1 0',
  minWidth: 0,
  /**
   * MUI Slider resolves rail/track clicks against the root’s padded box. `py: 0` (common in dense
   * layouts) shrinks that box so clicks on the “middle” of the visible rail miss — keep a stable
   * vertical hit target without changing thumb geometry.
   */
  py: '6px',
  mx: 0.25,
  '& .MuiSlider-thumb': { width: 9, height: 9 },
  '& .MuiSlider-rail': { opacity: 0.32 },
};

export type AppLinearVolumeSliderProps = Omit<SliderProps, 'min' | 'max' | 'step' | 'size'> & {
  min?: SliderProps['min'];
  max?: SliderProps['max'];
  step?: SliderProps['step'];
  size?: SliderProps['size'];
};

/**
 * Standard **0–1 linear gain** slider for mix rails and similar (MUI `Slider` with safe defaults).
 * Prefer this over ad-hoc `Slider` copies so rail / track clicks stay reliable in tight layouts.
 *
 * When the displayed value comes from async storage (e.g. Dexie + live query), use **local state**
 * in `onChange` and persist in `onChangeCommitted` (or after `await persist`) so the thumb does not
 * fight stale props mid-drag.
 */
export default function AppLinearVolumeSlider({
  min = 0,
  max = 1,
  step = DEFAULT_STEP,
  size = 'small',
  sx,
  ...rest
}: AppLinearVolumeSliderProps) {
  return (
    <Slider
      min={min}
      max={max}
      step={step}
      size={size}
      sx={Array.isArray(sx) ? [BASE_SX, ...sx] : sx != null ? [BASE_SX, sx] : BASE_SX}
      {...rest}
    />
  );
}
