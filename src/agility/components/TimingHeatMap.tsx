import { type ReactElement } from 'react';

export interface SlotTimingHit {
  slotIndex: number;
  deltaMs: number;
}

interface TimingHeatMapProps {
  slots: SlotTimingHit[];
  width: number;
  height?: number;
}

export default function TimingHeatMap({ slots, width, height = 40 }: TimingHeatMapProps): ReactElement {
  if (slots.length === 0) {
    return <div />;
  }
  const maxAbs = Math.max(12, ...slots.map((s) => Math.abs(s.deltaMs)));
  const gap = Math.max(1, width / slots.length);

  return (
    <svg
      role="img"
      aria-label="Rhythm deviation map — pink is early rush, blue is dragging late."
      width={width}
      height={height + 28}
      viewBox={`0 0 ${width} ${height + 28}`}
    >
      <text x={0} y={12} fill="var(--ag-text)" fontSize={11}>
        Rush (early) ⟶
      </text>
      {slots.map((s, i) => {
        const x = i * gap;
        const hue = s.deltaMs < 0 ? 'var(--ag-rush)' : 'var(--ag-drag)';
        const intensity = Math.min(1, Math.abs(s.deltaMs) / maxAbs);
        return (
          <rect
            key={s.slotIndex}
            className={s.deltaMs < 0 ? 'agility-marker-rush' : 'agility-marker-drag'}
            x={x}
            y={18 + height * (1 - intensity)}
            width={Math.max(2, gap - 1)}
            height={height * intensity + 6}
            fill={hue}
            fillOpacity={0.35 + 0.65 * intensity}
          />
        );
      })}
      <text x={0} y={height + 30} fill="var(--ag-text-muted)" fontSize={10}>
        Drag (late) ⇐
      </text>
    </svg>
  );
}
