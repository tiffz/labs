import { type ReactElement } from 'react';
import type { MelodiaStaffLayout } from './MelodiaStaff';
import type { PitchPerNote } from '../analysis';
import { buildHeatRects } from './MelodiaHeatMap.utils';

export interface MelodiaHeatMapProps {
  layout: MelodiaStaffLayout;
  perNote: PitchPerNote[];
  className?: string;
}

/**
 * Soft pink wash painted between adjacent rendered note heads. Higher opacity
 * = more samples drifted off that note during the sing phase.
 */
export default function MelodiaHeatMap({
  layout,
  perNote,
  className,
}: MelodiaHeatMapProps): ReactElement | null {
  if (layout.noteFrames.length === 0) return null;
  const rects = buildHeatRects(layout, perNote);
  if (rects.length === 0) return null;
  return (
    <svg
      className={`melodia-overlay-svg ${className ?? ''}`.trim()}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="presentation"
      aria-hidden
    >
      {rects.map((r) =>
        r.opacity > 0 ? (
          <rect
            key={r.index}
            className="melodia-heat-rect"
            x={r.x}
            y={20}
            width={r.width}
            height={layout.height - 30}
            opacity={r.opacity}
          >
            <title>{r.tooltip}</title>
          </rect>
        ) : null,
      )}
    </svg>
  );
}
