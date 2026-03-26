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

/**
 * Thin wrapper around MUI Slider that adapts callbacks to app legacy range events.
 */
export default function AppSlider({
  value,
  onChange,
  className,
  style,
  ...rest
}: AppSliderProps): React.ReactElement {
  return (
    <Slider
      value={value}
      className={['app-slider', className].filter(Boolean).join(' ')}
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
