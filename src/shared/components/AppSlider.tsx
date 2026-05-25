import React from 'react';
import Slider from '@mui/material/Slider';
import type { SliderProps } from '@mui/material/Slider';
import './appSlider.css';

type RangeLikeEvent = {
  target: { value: string };
};

interface AppSliderProps extends Omit<SliderProps, 'onChange' | 'value' | 'defaultValue'> {
  value: number;
  onChange?: (event: RangeLikeEvent) => void;
  className?: string;
  style?: React.CSSProperties;
}

function showsValueLabel(
  valueLabelDisplay: SliderProps['valueLabelDisplay'],
): boolean {
  return valueLabelDisplay === 'auto' || valueLabelDisplay === 'on';
}

/**
 * Thin wrapper around MUI Slider that adapts callbacks to app legacy range events.
 * When `valueLabelDisplay` is `auto` or `on`, adds `app-slider--with-value-label` so
 * the thumb tooltip is not clipped (see appSlider.css and SHARED_UI_CONVENTIONS.md).
 */
export default function AppSlider({
  value,
  onChange,
  className,
  style,
  valueLabelDisplay,
  ...rest
}: AppSliderProps): React.ReactElement {
  const withValueLabel = showsValueLabel(valueLabelDisplay);
  return (
    <Slider
      value={value}
      valueLabelDisplay={valueLabelDisplay}
      className={[
        'app-slider',
        withValueLabel ? 'app-slider--with-value-label' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      onChange={(_, nextValue) => {
        const next = Array.isArray(nextValue) ? nextValue[0] : nextValue;
        if (typeof next !== 'number') return;
        onChange?.({ target: { value: String(next) } });
      }}
      {...rest}
    />
  );
}
