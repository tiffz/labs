import { type ReactElement } from 'react';
import { catmullRomPath } from '../../shared/drawing/catmullRomBezier';

export interface PitchInkTraceProps {
  samples: readonly { t: number; midi: number | null }[];
  durationSec: number;
  lowMidi: number;
  highMidi: number;
  width: number;
  height: number;
}

function yForMidi(midi: number, lowMidi: number, highMidi: number, height: number): number {
  const span = Math.max(1, highMidi - lowMidi);
  const n = (midi - lowMidi) / span;
  return height - n * height * 0.85 - height * 0.075;
}

function timeToX(t: number, durationSec: number, width: number, staveX: number): number {
  if (durationSec <= 0) return staveX;
  const ratio = Math.max(0, Math.min(1, t / durationSec));
  return staveX + ratio * width;
}

export default function PitchInkTrace(props: PitchInkTraceProps): ReactElement | null {
  const { samples, durationSec, lowMidi, highMidi, width, height } = props;
  const staveX = 8;
  const staveW = width - 16;
  const pts: Array<{ x: number; y: number }> = [];
  const recentPts: Array<{ x: number; y: number }> = [];

  let tMax = 0;
  for (const p of samples) {
    if (p.midi !== null) tMax = Math.max(tMax, p.t);
  }
  const cutT = tMax - 1.25;
  for (const p of samples) {
    if (p.midi === null) continue;
    const xy = {
      x: timeToX(p.t, durationSec, staveW, staveX),
      y: yForMidi(p.midi, lowMidi, highMidi, height - 24),
    };
    pts.push(xy);
    if (p.t >= cutT) recentPts.push(xy);
  }

  if (pts.length === 0) return null;

  const pathAll = catmullRomPath(pts);
  const pathRecent = recentPts.length > 0 ? catmullRomPath(recentPts) : pathAll;

  return (
    <svg
      role="presentation"
      className="agility-svg-staff-border"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      {[0, 1, 2, 3, 4].map((line) => {
        const y = 36 + line * 10;
        return (
          <line
            key={line}
            x1={staveX}
            x2={staveX + staveW}
            y1={y}
            y2={y}
            stroke="var(--ag-staff-line)"
            strokeOpacity={0.22}
            strokeWidth={1.2}
          />
        );
      })}
      <path className="agility-trail-soft" d={pathAll} aria-hidden />
      <path className="agility-trail-strong" d={pathRecent} aria-hidden />
    </svg>
  );
}
