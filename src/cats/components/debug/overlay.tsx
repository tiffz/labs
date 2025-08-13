import React from 'react';
import { OverlayColors, isOverlayEnabled } from './overlay';

type MassBoxProps = { left: number; bottom: number; width: number; height: number };
export const MassBoxOverlay: React.FC<MassBoxProps> = ({ left, bottom, width, height }) => {
  if (!isOverlayEnabled()) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: `${Math.round(left)}px`,
        bottom: `${Math.round(bottom)}px`,
        width: `${Math.round(width)}px`,
        height: `${Math.round(height)}px`,
        border: `1px dashed ${OverlayColors.massBox}`,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    />
  );
};

export const BaselineOverlay: React.FC<{ x: number; width: number; y: number; z?: number }> = ({ x, width, y }) => {
  if (!isOverlayEnabled()) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: `${Math.round(x)}px`,
        bottom: `${Math.round(y)}px`,
        width: `${Math.round(width)}px`,
        height: '2px',
        background: OverlayColors.baseline,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    />
  );
};


