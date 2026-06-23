import Slider from '@mui/material/Slider';
import type { SliderProps } from '@mui/material/Slider';

const BASE_SX: NonNullable<SliderProps['sx']> = {
  flex: '1 1 0',
  minWidth: 0,
  py: '6px',
  mx: 0.25,
  '& .MuiSlider-thumb': { width: 9, height: 9 },
  '& .MuiSlider-rail': { opacity: 0.32 },
};

export type AppCompactSliderProps = SliderProps;

/**
 * Standard MUI slider with reliable rail/track clicks in dense layouts.
 * Use {@link AppLinearVolumeSlider} for 0–1 gain rails; use this for latency, MIDI range, etc.
 */
export default function AppCompactSlider({ size = 'small', sx, ...rest }: AppCompactSliderProps) {
  return (
    <Slider
      size={size}
      sx={Array.isArray(sx) ? [BASE_SX, ...sx] : sx != null ? [BASE_SX, sx] : BASE_SX}
      {...rest}
    />
  );
}
