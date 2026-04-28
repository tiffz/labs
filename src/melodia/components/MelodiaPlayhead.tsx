import { type ReactElement } from 'react';
import type { MelodiaStaffLayout } from './MelodiaStaff';

export interface MelodiaPlayheadProps {
  layout: MelodiaStaffLayout;
  /** 0..1 progress along the bar. */
  progress: number;
  className?: string;
}

/**
 * Animated vertical line rendered as an absolute overlay atop the staff.
 */
export default function MelodiaPlayhead({
  layout,
  progress,
  className,
}: MelodiaPlayheadProps): ReactElement | null {
  if (layout.staveWidth <= 0) return null;
  const ratio = Math.max(0, Math.min(1, progress));
  const x = layout.staveX + ratio * layout.staveWidth;
  return (
    <svg
      className={`melodia-overlay-svg ${className ?? ''}`.trim()}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="presentation"
      aria-hidden
    >
      <line className="melodia-playhead" x1={x} x2={x} y1={20} y2={layout.height - 12} />
    </svg>
  );
}
