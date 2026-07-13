import type { ReactElement } from 'react';

import {
  benDayDots,
  blobHeadPath,
  blobLimbPath,
  blobTorsoPath,
  citySkylinePath,
  natureHillsPath,
} from './blobShapes';
import type { PanelCompositionId } from './types';

export type CompositionBounds = { x: number; y: number; w: number; h: number };

function figureBlob(cx: number, cy: number, scale: number, color: string): ReactElement {
  const headY = cy - 28 * scale;
  const torsoTop = cy - 8 * scale;
  return (
    <g fill={color} stroke="none">
      <path d={blobHeadPath(cx, headY, scale)} />
      <path d={blobTorsoPath(cx, torsoTop, scale)} />
      <path d={blobLimbPath(cx - 10 * scale, torsoTop + 8 * scale, cx - 22 * scale, torsoTop + 36 * scale, 4 * scale)} />
      <path d={blobLimbPath(cx + 10 * scale, torsoTop + 8 * scale, cx + 22 * scale, torsoTop + 36 * scale, 4 * scale)} />
      <path d={blobLimbPath(cx - 6 * scale, torsoTop + 68 * scale, cx - 12 * scale, torsoTop + 98 * scale, 5 * scale)} />
      <path d={blobLimbPath(cx + 6 * scale, torsoTop + 68 * scale, cx + 14 * scale, torsoTop + 98 * scale, 5 * scale)} />
    </g>
  );
}

function profileBlob(cx: number, cy: number, scale: number, color: string): ReactElement {
  const s = scale;
  return (
    <g fill={color}>
      <path
        d={`M ${cx - 8 * s} ${cy - 20 * s}
        Q ${cx + 28 * s} ${cy - 24 * s}, ${cx + 26 * s} ${cy + 4 * s}
        Q ${cx + 24 * s} ${cy + 22 * s}, ${cx - 4 * s} ${cy + 18 * s}
        Q ${cx - 18 * s} ${cy + 16 * s}, ${cx - 8 * s} ${cy - 20 * s} Z`}
      />
      <path d={blobTorsoPath(cx + 4 * s, cy + 14 * s, s * 0.9)} />
    </g>
  );
}

export function renderMockupComposition(
  id: PanelCompositionId,
  bounds: CompositionBounds,
  color: string,
  accent = '#888',
): ReactElement | null {
  if (id === 'empty') return null;
  const { x, y, w, h } = bounds;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const scale = Math.min(w, h) / 180;

  switch (id) {
    case 'big-head':
      return (
        <g>
          <path d={blobHeadPath(cx, cy + h * 0.08, scale * 2.4)} fill={color} />
          <ellipse cx={cx - 18 * scale} cy={cy - h * 0.02} rx={8 * scale} ry={10 * scale} fill="#fff" opacity={0.35} />
          <ellipse cx={cx + 18 * scale} cy={cy - h * 0.02} rx={8 * scale} ry={10 * scale} fill="#fff" opacity={0.35} />
        </g>
      );
    case 'extreme-closeup':
      return (
        <g fill={color}>
          <ellipse cx={cx - w * 0.14} cy={cy} rx={w * 0.16} ry={h * 0.12} />
          <ellipse cx={cx + w * 0.14} cy={cy} rx={w * 0.16} ry={h * 0.12} />
          <ellipse cx={cx - w * 0.14} cy={cy} rx={w * 0.05} ry={h * 0.05} fill="#111" />
          <ellipse cx={cx + w * 0.14} cy={cy} rx={w * 0.05} ry={h * 0.05} fill="#111" />
        </g>
      );
    case 'profile':
      return profileBlob(cx, cy, scale * 1.6, color);
    case 'back-of-head':
      return (
        <g>
          <ellipse cx={cx} cy={cy - h * 0.08} rx={w * 0.22} ry={h * 0.18} fill={color} />
          <path d={blobTorsoPath(cx, cy + h * 0.02, scale * 1.2)} fill={color} />
          <rect x={x + w * 0.08} y={y + h * 0.55} width={w * 0.12} height={h * 0.35} fill={accent} opacity={0.25} />
        </g>
      );
    case 'full-figure':
      return figureBlob(cx, cy + h * 0.06, scale * 1.3, color);
    case 'silhouette-dark':
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} fill="#f2f2ec" />
          {figureBlob(cx, cy + h * 0.04, scale * 1.2, '#1a1a1a')}
        </g>
      );
    case 'silhouette-light':
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} fill="#222" />
          {figureBlob(cx, cy + h * 0.04, scale * 1.2, '#f0f0ea')}
        </g>
      );
    case 'down-shot':
      return (
        <g>
          {figureBlob(cx - w * 0.18, cy + h * 0.08, scale * 0.75, color)}
          {figureBlob(cx + w * 0.12, cy + h * 0.12, scale * 0.7, color)}
          <ellipse cx={cx - w * 0.18} cy={cy + h * 0.28} rx={w * 0.1} ry={h * 0.04} fill="#000" opacity={0.15} />
          <ellipse cx={cx + w * 0.12} cy={cy + h * 0.32} rx={w * 0.09} ry={h * 0.035} fill="#000" opacity={0.15} />
        </g>
      );
    case 'aerial':
      return (
        <g>
          <path d={natureHillsPath(x, y + h * 0.2, w, h * 0.8)} fill={accent} opacity={0.35} />
          {figureBlob(cx, cy, scale * 0.55, color)}
          <ellipse cx={cx} cy={cy + h * 0.08} rx={w * 0.06} ry={h * 0.02} fill="#000" opacity={0.12} />
        </g>
      );
    case 'depth':
      return (
        <g>
          <rect x={x + w * 0.04} y={y + h * 0.08} width={w * 0.22} height={h * 0.84} fill={accent} opacity={0.35} />
          <rect x={x + w * 0.74} y={y + h * 0.12} width={w * 0.22} height={h * 0.8} fill={accent} opacity={0.35} />
          {figureBlob(cx + w * 0.08, cy + h * 0.1, scale * 0.65, color)}
        </g>
      );
    case 'reflection':
      return (
        <g>
          {figureBlob(cx, cy - h * 0.12, scale * 1.1, color)}
          <g opacity={0.45} transform={`translate(0 ${h * 0.42}) scale(1 -1)`}>
            {figureBlob(cx, cy - h * 0.12, scale * 1.1, color)}
          </g>
          <rect x={x} y={cy + h * 0.08} width={w} height={h * 0.04} fill={accent} opacity={0.4} />
        </g>
      );
    case 'side-light':
      return (
        <g>
          <rect x={x} y={y} width={w * 0.52} height={h} fill="#111" opacity={0.12} />
          {figureBlob(cx + w * 0.06, cy, scale * 1.2, color)}
        </g>
      );
    case 'big-object':
      return (
        <g>
          <ellipse cx={cx - w * 0.12} cy={cy + h * 0.18} rx={w * 0.38} ry={h * 0.32} fill={color} opacity={0.85} />
          {figureBlob(cx + w * 0.18, cy + h * 0.08, scale * 0.85, accent)}
        </g>
      );
    case 'open-panel':
      return (
        <g>
          {figureBlob(cx - w * 0.12, cy, scale * 1.25, color)}
          <path d={blobHeadPath(cx - w * 0.28, cy - h * 0.02, scale * 1.5)} fill={color} opacity={0.5} />
        </g>
      );
    case 'small-figure':
      return (
        <g>
          <path d={citySkylinePath(x, y + h * 0.42, w, h * 0.58)} fill={accent} opacity={0.3} />
          {figureBlob(cx, cy + h * 0.22, scale * 0.45, color)}
        </g>
      );
    case 'city-scene':
      return (
        <g>
          <path d={citySkylinePath(x, y + h * 0.25, w, h * 0.75)} fill={color} opacity={0.75} />
          <path d={benDayDots(x, y + h * 0.1, w, h * 0.35, 10, 1.2)} fill={accent} opacity={0.35} />
        </g>
      );
    case 'nature-scene':
      return (
        <g>
          <path d={natureHillsPath(x, y + h * 0.15, w, h * 0.85)} fill={accent} opacity={0.4} />
          <ellipse cx={cx - w * 0.2} cy={y + h * 0.28} rx={w * 0.08} ry={h * 0.12} fill={color} opacity={0.55} />
          <ellipse cx={cx + w * 0.25} cy={y + h * 0.22} rx={w * 0.1} ry={h * 0.14} fill={color} opacity={0.5} />
        </g>
      );
    case 'contrast':
      return (
        <g>
          <rect x={x} y={y} width={w / 2} height={h} fill="#111" opacity={0.85} />
          <rect x={x + w / 2} y={y} width={w / 2} height={h} fill="#f5f5f0" />
          {figureBlob(cx - w * 0.18, cy, scale * 0.9, '#f0f0ea')}
          {figureBlob(cx + w * 0.18, cy, scale * 0.9, '#1a1a1a')}
        </g>
      );
    case 'ben-day':
      return (
        <g>
          <path d={benDayDots(x, y, w, h, 9, 1.4)} fill={accent} opacity={0.45} />
          {figureBlob(cx, cy + h * 0.06, scale * 1.05, color)}
        </g>
      );
    case 'frame':
      return (
        <g fill="none" stroke={color} strokeWidth={Math.max(2, scale * 6)}>
          <rect x={x + w * 0.1} y={y + h * 0.12} width={w * 0.8} height={h * 0.76} />
          <line x1={x + w * 0.1} y1={y + h * 0.38} x2={x + w * 0.9} y2={y + h * 0.38} />
          <line x1={x + w * 0.45} y1={y + h * 0.12} x2={x + w * 0.45} y2={y + h * 0.88} />
          {figureBlob(cx + w * 0.12, cy + h * 0.08, scale * 0.55, accent)}
        </g>
      );
    case 'three-stage':
      return (
        <g>
          <ellipse cx={cx - w * 0.22} cy={cy + h * 0.18} rx={w * 0.14} ry={h * 0.2} fill={color} opacity={0.9} />
          {figureBlob(cx, cy + h * 0.04, scale * 0.85, color)}
          <path d={citySkylinePath(x, y + h * 0.55, w, h * 0.45)} fill={accent} opacity={0.28} />
        </g>
      );
    case 'horizon-scene': {
      const horizonY = y + h * 0.56;
      return (
        <g>
          <rect x={x} y={y} width={w} height={horizonY - y} fill="#dce9f5" />
          <rect x={x} y={horizonY} width={w} height={y + h - horizonY} fill="#e8dcc8" />
          <line
            x1={x + w * 0.04}
            y1={horizonY}
            x2={x + w * 0.96}
            y2={horizonY}
            stroke={color}
            strokeWidth={Math.max(2, scale * 4)}
            strokeLinecap="round"
          />
        </g>
      );
    }
    default:
      return null;
  }
}
