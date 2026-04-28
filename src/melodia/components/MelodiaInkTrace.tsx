import { type ReactElement } from 'react';
import type { MelodiaStaffLayout } from './MelodiaStaff';
import type { PitchTrailPoint } from '../types';
import { catmullRomPath } from './MelodiaInkTrace.utils';

export interface MelodiaInkTraceProps {
  layout: MelodiaStaffLayout;
  pitchTrail: PitchTrailPoint[];
  /**
   * Approximate elapsed singing time (seconds). Reserved for callers that want
   * to drive a trailing-window opacity gradient — currently the component
   * derives its own cut-off from the trail's last sample.
   */
  elapsedSec?: number;
  className?: string;
}

interface XY {
  x: number;
  y: number;
}

function timeToX(layout: MelodiaStaffLayout, t: number): number {
  if (layout.totalDurSec <= 0) return layout.staveX;
  const ratio = Math.max(0, Math.min(1, t / layout.totalDurSec));
  return layout.staveX + ratio * layout.staveWidth;
}

function trailToPoints(
  layout: MelodiaStaffLayout,
  trail: PitchTrailPoint[],
): { all: XY[]; recent: XY[]; cutT: number } {
  const cutT = trail.length > 0 ? Math.max(0, trail[trail.length - 1]!.t - 1.5) : 0;
  const all: XY[] = [];
  const recent: XY[] = [];
  for (const sample of trail) {
    if (sample.midi === null) continue;
    const point = { x: timeToX(layout, sample.t), y: layout.yForMidi(sample.midi) };
    all.push(point);
    if (sample.t >= cutT) recent.push(point);
  }
  return { all, recent, cutT };
}

/**
 * SVG overlay that renders the live pitch trail as a smooth pink ink path
 * over the rendered staff. Pure render component — caller owns the trail.
 */
export default function MelodiaInkTrace({
  layout,
  pitchTrail,
  className,
}: MelodiaInkTraceProps): ReactElement | null {
  if (layout.noteFrames.length === 0) return null;
  const { all, recent } = trailToPoints(layout, pitchTrail);
  if (all.length === 0) return null;
  const trailPath = catmullRomPath(all);
  const recentPath = catmullRomPath(recent);
  return (
    <svg
      className={`melodia-overlay-svg ${className ?? ''}`.trim()}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="presentation"
      aria-hidden
    >
      <path className="melodia-ink-path is-trail" d={trailPath} />
      {recentPath && <path className="melodia-ink-path" d={recentPath} />}
    </svg>
  );
}
